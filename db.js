'use strict'

const serviceAccount = require('./service.json');
const admin = require('firebase-admin')
const projectId = serviceAccount.project_id
const config = {
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${projectId}.firebaseio.com`,
    projectId: projectId,
}
const firebase = admin.initializeApp(config)

class Database {
    async getData(path) {
        let ref = firebase.database().ref(path)
        let value = await ref.once('value').then(function(snapshot) {
            return snapshot.val()
        })
        return value
    }

    async setData(path, val) {
        let set = await firebase.database().ref(path).set(val)
            .then(() => { return val })
            .catch( (err) => { return err })
        return set
    }

    async getAccounts() {
        let accounts = await this.getData('/account')
        if (!accounts) accounts = []
        return accounts
    }

    async nextAccount(currentEmail = 'null') {
        let accounts = await this.getAccounts()
        let index = accounts.findIndex(v => v.email == currentEmail)
        for (let i in accounts) {
            accounts[i].active = false
        }
        index++

        let nextIndex = index >= accounts.length ? 0 : index
        accounts[nextIndex].active = true

        await this.setData('/account', accounts)
        return accounts
    }

    async saveAccount(detail) {
        let accounts = await this.getAccounts()
        let exist = accounts.findIndex(v => v.email == detail.email)
        if (exist >= 0) {
            accounts[exist] = detail
        } else {
            accounts.push(detail)
        }

        await this.setData('/account', accounts)
        return accounts
    }

}

module.exports = new Database