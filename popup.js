let highlightAdUnits = document.getElementById('highlightAdUnits'),
    hideAdUnits = document.getElementById('hideAdUnits'),
    checkTags = document.getElementById('checkTags'),
    showDetails = document.getElementById('showDetails'),
    checkAdsTxt = document.getElementById('checkAdsTxt'),
    clearStorage = document.getElementById('clearStorage'),
    errsList = document.getElementById("errsList"),
    adUnitErrs = document.getElementById('adUnitErrs'),
    homeCheck = document.getElementById('homepageCheck'),
    articleCheck = document.getElementById('articleCheck')

// bkg provides acces to extension console since popup.js and popup.html have console separate
// from content and extension
let bkg = chrome.extension.getBackgroundPage()

// Get activeTabUrl since it is used in different parts of the file
// and to be able to fetch fresh information from storage
// that is relevant to the currently active tab url
let activeTabUrl = chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    activeTabUrl = new URL(tabs[0].url)
    chrome.storage.sync.get(activeTabUrl.hostname, function (data) {
        if (!data[activeTabUrl.hostname]) {
            let newInput = new Object()
            newInput.highlight = false
            let json = {}
            json[activeTabUrl.hostname] = newInput
            chrome.storage.sync.set(json)
        }
        updateInfo(data[activeTabUrl.hostname])
    })

    // Get saved value for highlight each time the extension icon is clicked
    chrome.storage.sync.get(activeTabUrl.hostname, (data) => {
        if (data[activeTabUrl.hostname]) {
            highlightAdUnits.checked = data[activeTabUrl.hostname].highlight
            if (highlightAdUnits.checked) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { command: "highlight", highlight: highlightAdUnits.checked }, (response) => {
                        bkg.console.log(response.result)
                    })
                })
            }
        }
    })
})

clearStorage.onclick = () => {
    chrome.storage.sync.clear(() => {
        bkg.console.log("Storage sync has been cleared")
    })
}

highlightAdUnits.onchange = function () {
    let value = this.checked
    let json = {}

    // chrome.storage.sync.get(activeTabUrl.hostname, (data) => {
    //     if (data[activeTabUrl.hostname]) {

    //     }
    // })
    // json[activeTabUrl.hostname] = value
    // chrome.storage.sync.set(json)
    updateStorage({ highlight: value })

    // Pass highlight or unhighlight message to content script 
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
}

hideAdUnits.onclick = function (element) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { command: "hide" }, function (response) {
            bkg.console.log(response.result)
        })
    })
    highlightAdUnits.checked = false
}

// Pass to the function the information from the content script and the origin url so it can be
// saved in storage under publisher name key
let updateStorage = (publisherUpdate, sendResponse) => {
    let publisher = activeTabUrl.hostname
    let fresh = publisherUpdate

    // First try and get stored information
    chrome.storage.sync.get(publisher, (stored) => {
        let isStored = stored[publisher]
        stored = stored[publisher]

        // If the no information is stored for the publisher
        // create a new entry named [publisher]
        if (!isStored) {
            let json = {}
            json[publisher] = publisherUpdate
            chrome.storage.sync.set(json)
        }
        else {
            // Here the rest of the properties are iterated over and updated
            for (let info in fresh) {
                // Do not update adUnits property
                if (info == 'adUnits')
                    continue

                stored[info] = publisherUpdate[info]
            }

            //Ad units are an object inside an object and are iterated separately
            let oldAdUnits = stored.adUnits
            let newAdUnits = fresh.adUnits
            if (newAdUnits) {
                let homepageCheck = publisherUpdate.homepageCheck
                let articleCheck = publisherUpdate.articleCheck

                // Values for inHomepage and inArticle should be modified only if the
                // update homepageCheck = true or articleCheck = true
                if (oldAdUnits) {
                    for (let adUnit in newAdUnits) {
                        if (newAdUnits[adUnit]) {

                            for (let details in newAdUnits[adUnit]) {
                                if (details == 'inHomepage' && !homepageCheck)
                                    continue
                                if (details == 'inArticle' && !articleCheck)
                                    continue
                                oldAdUnits[adUnit][details] = newAdUnits[adUnit][details]
                            }

                        }
                    }
                } else {
                    stored.adUnits = newAdUnits
                }
            }

            let json = {}
            json[publisher] = stored

            chrome.storage.sync.set(json, () => {
                typeof sendResponse === 'function' && sendResponse('stored')
            })
        }
    })
}

checkAdsTxt.onclick = function () {
    let localAdstxt = ''
    let adstxt = ''
    let missingLines = []

    // The function loads static ads.txt from local folder, splits it into
    // an array at '\n' than splits it once more so that each comma in a line
    // is a split point. This way each comma separated value in each line can
    // be compared against another line that is generated in the same way but
    // originates from the activeTabUrl.origin /ads.txt
    let compareAdsTxt = () => {

        // Split lines first
        localAdstxt = localAdstxt.split('\n')
        adstxt = adstxt.split('\n')

        for (let localLine of localAdstxt) {
            let onSite = false
            // Each line is split into comma separated list (bidder name, publisher ID)
            // trimmed of spaces for consistency. Iterate over local ads.txt and try to
            // match it against the origin site ads.txt. If unable push missing lines
            // into a variable missingLines
            let localItems = localLine.split(',').map((item) => item.trim())
            for (let siteLine of adstxt) {
                let siteItems = siteLine.split(',').map((item) => item.trim())
                if (localItems[0] == siteItems[0] && localItems[1] == siteItems[1]) {
                    onSite = true
                }
            }
            if (!onSite)
                missingLines.push(localLine)
        }

        // So far the value is only shown inside the extension console
        bkg.console.log(missingLines)
    }

    function reqListenerLocal() {
        localAdstxt = this.responseText
        onsite.send()
    }

    function reqListenerSite() {
        adstxt = this.responseText
        compareAdsTxt()
    }

    // Prepare local XHR, inside its request listener call the send()
    // for origin ads.txt.
    let local = new XMLHttpRequest()
    local.open("GET", './ads.txt')
    local.responseType = 'text'
    local.addEventListener("loadend", reqListenerLocal)
    local.send()

    // Remote send() is called from reqListenerLocal to make sure that
    // both adstxt and localAdsTxt are resolved before calling compare function
    let hostAdsTxt = activeTabUrl.origin + '/ads.txt'
    let onsite = new XMLHttpRequest()
    onsite.open("GET", hostAdsTxt)
    onsite.responseType = 'text'
    onsite.addEventListener("loadend", reqListenerSite)

}

showDetails.onclick = function () {
    chrome.storage.sync.get(activeTabUrl.hostname, (data) => {

        // The detailed information about the current site is displayed
        // inside extension console
        bkg.console.log(activeTabUrl.hostname, data[activeTabUrl.hostname])
    })
}

// Check tags function sendsMessage for the content script to check tags
checkTags.onclick = function (element) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { command: "checkTags" })
    })
}

// Function to remove HTML nodes completly since they only get hidden
// and child elements are stacking upon each apppendChild call
let removeNode = (node) => {
    while (node.lastChild) {
        node.removeChild(node.lastChild);
    }
    node.remove()
}

// Update displayed info. When changes object is passed the function check
// if there are 'unchecked' keys, in which case the user should check them as
// suggested in the help text. The function appends the names of all adunits
// and displays brief error information
let updateInfo = (changes) => {
    removeNode(adUnitErrs)
    if (changes && changes.adUnits) {
        let adUnits = changes.adUnits
        for (let adUnit in adUnits) {
            // Create parent element per adunit
            let err = document.createElement('ul')
            // Create children per adunit errs
            let msg = document.createElement('li')
            err.innerText = adUnits[adUnit].name

            // If else checks if inHomepage and inArticle information is
            // available. If not it suggests to the user to make the missing
            // check.
            articleCheck.checked = changes.articleCheck
            homepageCheck.checked = changes.homepageCheck

            // If both values, inHomepage and inArticle are false and the checks
            // have been made the error message states it
            if (!adUnits[adUnit].inArticle && changes.articleCheck && !adUnits[adUnit].inHomepage && changes.homepageCheck) {
                msg.innerText = 'NOT found in BODY'
                err.appendChild(msg)
            }

            // If inScript value is false it is shown in the popup display
            if (!adUnits[adUnit].inScript) {
                msg.innerText = 'NOT found in script'
                err.appendChild(msg)
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

            // If there are new values regarding the current active tab
            // they are passed on to the updateInfo function so the displayed
            // information can be updated. Else the changes obj contains only
            // oldInfo key meaning the storage has been cleared (newValue == undefined)
            // requiring the popup.html to be cleared of all error info elements
            if (isNew) {
                chrome.storage.sync.get(activeTabUrl.hostname, (data) => {
                    updateInfo(data[activeTabUrl.hostname])
                })
            }
            else
                updateInfo(undefined)
        }
    }
    )
})

// Script url is the url extracted in content, passed here in a message and the script body
// will be sent back to content as a response to that message.
let fetchScript = (scriptUrl, sendResponse) => {
    function reqListener() {
        let response = this.responseText
        if (response)
            sendResponse(response)
        else sendResponse('')
    };

    let xhr = new XMLHttpRequest();
    xhr.open('GET', scriptUrl, true)
    xhr.responseType = 'text'
    xhr.addEventListener("loadend", reqListener)
    xhr.send()
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        let publisher = new URL(sender.tab.url).hostname

        switch (request.command) {
            case 'scriptUrl':
                fetchScript(request.url, sendResponse)
                break
            case 'publisher':
                updateStorage(request.publisher, sendResponse)
                break
            default:
                sendResponse({ result: "Unrecognized request.command" })
        }

        // True needs to be returned in all message listeners in order to keep the message channel
        // open until a reponse is received
        return true
    }
)

