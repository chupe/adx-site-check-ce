import * as check from "./check.js"
import * as storage from "../common/storage.js"

chrome.runtime.onInstalled.addListener(() => {
    console.log("LuponMedia script started")
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    let action = (command) => {

        switch (command) {
            case 'adstxt':
                check.adstxt(message.originUrl)
                break
            case 'checkTags':
                check.tags(message.url)
                break
            case 'store':
                storage.update(message.update)
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
