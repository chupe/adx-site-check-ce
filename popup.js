let showAdUnits = document.getElementById('showAdUnits')
let hideAdUnits = document.getElementById('hideAdUnits')
let checkTags = document.getElementById('checkTags')
let clearStorage = document.getElementById('clearStorage')
let bkg = chrome.extension.getBackgroundPage()

clearStorage.onclick = () => {
    chrome.storage.sync.clear(() => {
        bkg.console.log("Storage sync has been cleared")
    })
}

//on init update the UI checkbox based on storage
chrome.storage.sync.get('hide', function (data) {
    showAdUnits.checked = data.hide
});

showAdUnits.onchange = function (element) {
    let value = this.checked

    //update the extension storage value
    chrome.storage.sync.set({ 'hide': value })

    //Pass init or remove message to content script 
    if (value) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { command: "highlight", hide: value }, function (response) {
                bkg.console.log(response.result)
            })
        })
    } else {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { command: "unhighlight", hide: value }, function (response) {
                bkg.console.log(response.result)
            })
        })
    }

};

hideAdUnits.onclick = function (element) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { command: "hide" }, function (response) {
            bkg.console.log(response.result)
        })
    })
}

checkTags.onclick = function (element) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { command: "checkTags" }, function (response) {
            bkg.console.log(response.result)
        })
    })
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {

        let fetchScript = () => {
            function reqListener() {
                let response = this.responseText
                if (response)
                    sendResponse(response)
                else sendResponse('')

            };

            let xhr = new XMLHttpRequest();
            xhr.open('GET', request.url, true)
            xhr.responseType = 'text'
            xhr.addEventListener("loadend", reqListener)
            xhr.send()
        }

        let updateStorage = () => {

            let adUnitsUpdate = request.adUnitsInfo
            let publisher = new URL(sender.tab.url).hostname

            chrome.storage.sync.get(publisher, (storedInfo) => {

                let isStoredInfoEmpty = Object.keys(storedInfo).length === 0 && storedInfo.constructor === Object

                // If the no information is stored for the publisher
                // create a new entry named [publisher]
                if (isStoredInfoEmpty) {
                    let json = new Object()
                    json[publisher] = adUnitsUpdate
                    chrome.storage.sync.set(json, () => {
                        chrome.storage.sync.get(publisher, (update) => {
                            bkg.console.log('this is first time input: ', update)
                        })
                    })

                } else {

                    // Update the 'unchecked' fields
                    for (let i = 0; i < storedInfo[publisher].length; i++) {
                        let inHomeUnchecked = adUnitsUpdate[i].inHomepageBody == 'unchecked'
                        let inArticleUnchecked = adUnitsUpdate[i].inArticleBody == 'unchecked'

                        if (!inHomeUnchecked)
                            if (storedInfo[publisher][i].inHomepageBody != adUnitsUpdate[i].inHomepageBody)
                                storedInfo[publisher][i].inHomepageBody = adUnitsUpdate[i].inHomepageBody

                        if (!inArticleUnchecked)
                            if (storedInfo[publisher][i].inArticleBody != adUnitsUpdate[i].inArticleBody)
                                storedInfo[publisher][i].inArticleBody = adUnitsUpdate[i].inArticleBody

                    }

                    chrome.storage.sync.set(storedInfo, () => {
                        chrome.storage.sync.get(publisher, (update) => {
                            bkg.console.log('this is updating ', update)
                        })
                    })
                }
            })
        }

        switch (request.command){
            case 'scriptUrl':
                fetchScript()
                break
            case 'adUnitsInfo':
                updateStorage()
                sendResponse()
                break
        }

        return true
    }
)