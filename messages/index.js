"use strict";
const builder = require("botbuilder");
const botbuilder_azure = require("botbuilder-azure");
const https = require('https');
const querystring = require('querystring');

var useEmulator = (process.env.NODE_ENV == 'development');
useEmulator = true;

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});
const kbId = process.env.kbId;
const qnamakerSubscriptionKey = process.env.qnamakerSubscriptionKey;

var bot = new builder.UniversalBot(connector);

bot.dialog('/', function (session) {


    session.sendTyping();

    const question = session.message.text;
    const postBody = JSON.stringify({ 'question': question });

    const options = {
        method: 'POST',
        path: `/qnamaker/v1.0/knowledgebases/${kbId}/generateAnswer`,
        host: 'westus.api.cognitive.microsoft.com',
        headers: {
            'Content-Length': Buffer.byteLength(postBody),
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': qnamakerSubscriptionKey
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            let result = JSON.parse(data);
            if (result.score > 50) {
                session.endConversation(result.answer);
            } else if (result.score > 0) {
                session.message(`I'm not completely sure if this is correct, but hopefully this will help...`)
                session.endConversation(result.answer)
            } else {
                session.endConversation(`I'm sorry, but I don't have the answer to that`);
            }
        });
    });
    req.write(postBody);
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
