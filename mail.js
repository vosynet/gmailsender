'use strict'

const { google } = require('googleapis')
const oauth = require("./oauth.json")
const { client_secret, client_id, redirect_uris } = oauth.web
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
const db = require('./db')
const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.send',
]

class Mail {
    async authorize() {
        let accounts = await db.getAccounts()
        let token = accounts.find(v => v.active == true)
        if (!token) {
            accounts = await db.nextAccount()
            token = accounts.find(v => v.active == true)
        }
        if (token) {
            oAuth2Client.setCredentials(token)
            return token
        } else {
            return false
        }
    }

    async authSave(req) {
        try {
            let { tokens } = await oAuth2Client.getToken(req.code)
            let info = await oAuth2Client.getTokenInfo(tokens.access_token)
            tokens.active = false
            tokens.email = info.email
            return await db.saveAccount(tokens)
        } catch(err) {
            return err
        }
    }

    async buildMessage({ sender, recipient, subject, body }, email) {
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
            `From: ${sender || 'noreply'} <${email}>`,
            'To: ' + recipient,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            body
        ]
        const message = messageParts.join('\n');
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        return encodedMessage
    }

    async loginUrl() {
        let authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
        })
        return authUrl
    }

    async sendMessage(data) {
        let authAccount = await this.authorize()
        if (!authAccount) {
            return {
                success: false,
                data: {}
            }
        }
        let message = await this.buildMessage(data, authAccount.email)
        let gmail = google.gmail({ version: 'v1', auth: oAuth2Client })
        try {
            let res = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: message,
                },
            })
            if (res.status == 429 || res.status == 403) {
                await db.nextAccount(authAccount.email)
            }
            return {
                status: res.status,
                data: res.data
            }
        }
        catch(err) {
            await db.nextAccount(authAccount.email)
            return {
                status: 500,
                data: {},
                error: err
            }
        }
    }
}

module.exports = new Mail
