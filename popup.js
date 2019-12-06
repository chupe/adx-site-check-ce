let highlightAdUnits = document.getElementById('highlightAdUnits'),
    hideAdUnits = document.getElementById('hideAdUnits'),
    checkTags = document.getElementById('checkTags'),
    showDetails = document.getElementById('showDetails'),
    checkAdsTxt = document.getElementById('checkAdsTxt'),
    clearStorage = document.getElementById('clearStorage'),
    homeCheck = document.getElementById('homepageCheck'),
    articleCheck = document.getElementById('articleCheck'),
    adstxtCheck = document.getElementById('adstxtCheck'),
    infoContainer = document.getElementById('infoContainer')

let activeTabHostname,
    activeTabOrigin,
    activeTabUrl

// Get activeTabUrl since it is used in different parts of the file
// and to be able to fetch fresh information from storage
// that is relevant to the currently active tab url
let activeTab = chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    activeTabUrl = new URL(tabs[0].url)
    activeTabHostname = activeTabUrl.hostname
    activeTabOrigin = activeTabUrl.origin
    chrome.storage.sync.get(activeTabHostname, (data) => {
        if (!data[activeTabHostname]) {
            chrome.runtime.sendMessage({
                command: 'updateStorage',
                publisher: activeTabHostname,
                update: { highlight: false }
            })
        } else {

            // Get saved value for highlight each time the extension icon is clicked
            highlightAdUnits.checked = data[activeTabHostname].highlight
            if (highlightAdUnits.checked) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    command: "highlight",
                    highlight: highlightAdUnits.checked
                })
            }
        }
        updateView(activeTabHostname)
    })
})

clearStorage.onclick = () => {
    chrome.storage.sync.clear(() => {
        updateView()
    })
}

highlightAdUnits.onchange = function () {
    let value = this.checked

    chrome.runtime.sendMessage({
        command: 'updateStorage',
        publisher: activeTabHostname,
        update: { highlight: value }
    })

    // Pass highlight or unhighlight message to content script 
    if (value) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                command: "highlight",
                highlight: value
            })
        })
    } else {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                command: "unhighlight",
                highlight: value
            })
        })
    }
}

hideAdUnits.onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { command: "hide" })
    })
    highlightAdUnits.checked = false
}

checkAdsTxt.onclick = () => {
    chrome.runtime.sendMessage({
        command: 'adstxt',
        publisher: activeTabHostname,
        originUrl: activeTabOrigin
    })
}

showDetails.onclick = () => {
    chrome.runtime.sendMessage({
        command: 'showDetails',
        publisher: activeTabHostname
    })
}

// Check tags function sendsMessage for the content script to check tags
checkTags.onclick = () => {

    chrome.runtime.sendMessage({
        command: "checkTags",
        publisher: activeTabHostname,
        url: activeTabUrl
    })
}

chrome.storage.onChanged.addListener((changes) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (changes[activeTabHostname]) {
            let isNew = changes[activeTabHostname].newValue

            // If there are new values regarding the current active tab
            // they are passed on to the updateInfo function so the displayed
            // information can be updated. Else the changes obj contains only
            // oldInfo key meaning the storage has been cleared (newValue == undefined)
            // requiring the popup.html to be cleared of all error info elements
            if (isNew) {
                chrome.storage.sync.get(activeTabHostname, (data) => {
                    updateView(activeTabHostname)
                })
            }
        }
    }
    )
})