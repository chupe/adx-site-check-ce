import * as storage from "./storage.js"
import * as check from "./check.js"

chrome.runtime.onInstalled.addListener(() => {
    console.log("LuponMedia script started")
})

let getHostname = () => {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            let activeTabHostname = new URL(tabs[0].url).hostname
            return resolve(activeTabHostname)
        })
    })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    let action = (command) => {

        switch (command) {
            case 'updateStorage':
                let json = {}
                json[message.publisher] = message.update
                storage.update(json).finally()
                break
            case 'showDetails':
                storage.showDetails()
                break
            case 'adstxt':
                check.adstxt(message.originUrl)
                break
            case 'checkTags':
                check.tags(message.publisher, message.url)
                break
            default:
                sendResponse({ result: "Unrecognized message.command" })
        }

        // True needs to be returned in all message listeners in order to keep the message channel
        // open until a reponse is received
        return true
    }

    if (Array.isArray(message.command)) {
        for (let command of message.command) {
            action(command)
        }
    } else action(message.command)
})
