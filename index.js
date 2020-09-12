'use strict'

const express = require("express")
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mail = require('./mail')
const db = require('./db')
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', async function(req, res) {
	let data = await db.getAccounts()
	data = data.map(v => {
		return {
			email: v.email,
			active: v.active,
			expired: new Date(v.expiry_date).toISOString(),
			access_token: v.access_token
		}
	})
	res.send(data)
})

app.get('/login', async function(req, res) {
	let loginUrl = await mail.loginUrl()
	res.redirect(loginUrl)
})

app.get('/auth_handler', async function(req, res) {
	await mail.authSave(req.query)
	res.redirect('/')
})

app.post('/send', async function(req, res) {
	let result = await mail.sendMessage(req.body)
	res.send(result)
})

app.listen(port, () => {
	console.log(`Listening on http://localhost:${port}`)
})
