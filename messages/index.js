"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
const kbId = process.env.kbId;
const https = require('https');
const querystring = require('querystring');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);

bot.dialog('/', function (session) {
    const message = session.message.text;
    const urlEncodedMessage = querystring.escape(message);
    const path = `/KBService.svc/GetAnswer?kbId=${kbId}&question=${urlEncodedMessage}`;

    const options = {
        path: path,
        host: 'qnaservice.cloudapp.net'
    };

    session.sendTyping();

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            let result = JSON.parse(data);
            if(result.score > 50) {
            session.endConversation(result.answer);
            } else if(result.score > 0) {
                session.message(`I'm not completely sure if this is correct, but hopefully this will help...`)
                session.endConversation(result.answer)
            } else {
                session.endConversation(`I'm sorry, but I don't have the answer to that`);
            }
        });
    });
    req.end();
});

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function () {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    module.exports = { default: connector.listen() }
}
