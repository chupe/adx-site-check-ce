let highlightAdUnits = document.getElementById('highlightAdUnits')
let hideAdUnits = document.getElementById('hideAdUnits')
let checkTags = document.getElementById('checkTags')
let clearStorage = document.getElementById('clearStorage')
let bkg = chrome.extension.getBackgroundPage()
let errsList = document.getElementById("errsList")
let adUnitErrs = document.getElementById('adUnitErrs')
let activeTabUrl = chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    activeTabUrl = new URL(tabs[0].url)
    chrome.storage.sync.get(activeTabUrl.hostname, function (data) {
        updateInfo(data[activeTabUrl.hostname])
    })
})
let activity = 0

chrome.storage.sync.set({ activity: activity++})

clearStorage.onclick = () => {
    chrome.storage.sync.clear(() => {
        bkg.console.log("Storage sync has been cleared")
    })
}

highlightAdUnits.onchange = function (element) {
    let value = this.checked

    //update the extension storage value
    chrome.storage.sync.set({ 'highlight': value })

    //Pass init or remove message to content script 
    if (value) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { command: "highlight", highlight: value }, function (response) {
                bkg.console.log(response.result)
            })
        })
    } else {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { command: "unhighlight", highlight: value }, function (response) {
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

let removeNode = (node) => {
    while (node.lastChild) {
        node.removeChild(node.lastChild);
    }
    node.remove()
}

let updateInfo = (changes) => {
    removeNode(adUnitErrs)
    if (changes) {
        for (let adUnit in changes) {
            let err = document.createElement('ul')
            let msg = document.createElement('li')
            err.innerText = changes[adUnit].name

            if (changes[adUnit].inArticleBody === 'unchecked') {
                msg.innerText = 'Now check Article'
                err.appendChild(msg)

            } else if (changes[adUnit].inHomepageBody === 'unchecked') {
                msg.innerText = 'Now check homepage'
                err.appendChild(msg)
            } else {

                if (!changes[adUnit].inHomepageBody && !changes[adUnit].inArticleBody) {
                    msg.innerText = 'NOT found in body'
                    err.appendChild(msg)
                }

                if (!changes[adUnit].inScript) {
                    msg.innerText = 'NOT found in script'
                    err.appendChild(msg)
                }
            }
            adUnitErrs.appendChild(err)
            errsList.appendChild(adUnitErrs)
        }
    } else {
        removeNode(adUnitErrs)
    }
}

chrome.storage.onChanged.addListener((changes) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (changes[activeTabUrl.hostname]) {
            let isNew = changes[activeTabUrl.hostname].newValue

            if (isNew)
                updateInfo(changes[activeTabUrl.hostname].newValue)
            else
                updateInfo(undefined)
        }
    }
    )
}
)

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
                    chrome.storage.sync.set(json)
                } else {

                    // Update the 'unchecked' fields
                    for (let adUnit in storedInfo[publisher]) {
                        let inHomeUnchecked = adUnitsUpdate[adUnit].inHomepageBody == 'unchecked'
                        let inArticleUnchecked = adUnitsUpdate[adUnit].inArticleBody == 'unchecked'

                        if (!inHomeUnchecked)
                            if (storedInfo[publisher][adUnit].inHomepageBody != adUnitsUpdate[adUnit].inHomepageBody)
                                storedInfo[publisher][adUnit].inHomepageBody = adUnitsUpdate[adUnit].inHomepageBody

                        if (!inArticleUnchecked)
                            if (storedInfo[publisher][adUnit].inArticleBody != adUnitsUpdate[adUnit].inArticleBody)
                                storedInfo[publisher][adUnit].inArticleBody = adUnitsUpdate[adUnit].inArticleBody

                    }

                    chrome.storage.sync.set(storedInfo)
                }
            })
        }

        switch (request.command) {
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

