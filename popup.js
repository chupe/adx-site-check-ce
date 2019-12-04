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
    activeTabOrigin

// Get activeTabUrl since it is used in different parts of the file
// and to be able to fetch fresh information from storage
// that is relevant to the currently active tab url
let activeTab = chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let activeTabUrl = new URL(tabs[0].url)
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
                chrome.tabs.sendMessage(tabs[0].id, { command: "highlight", highlight: highlightAdUnits.checked })
            }
        }
        updateInfo(data[activeTabHostname])
    })
})

clearStorage.onclick = () => {
    chrome.storage.sync.clear()
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
        url: activeTabOrigin
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
        publisher: activeTabHostname
    })
}

// Function to remove HTML nodes completly since they only get hidden
// and child elements are stacking upon each apppendChild call
let removeNode = (node) => {
    while (node.lastChild) {
        node.removeChild(node.lastChild)
    }
    node.remove()
}

// Check if an object is empty or has properties
let hasProperties = (obj) => {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop))
            return true
    }
}

// Update displayed info. When changes object is passed the function check
// if there are 'unchecked' keys, in which case the user should check them as
// suggested in the help text. The function appends the names of all adunits
// and displays brief error information
let updateInfo = () => {
    chrome.storage.sync.get(activeTabHostname, (data) => {
        let changes = data[activeTabHostname]

        // Update checkboxes
        adstxtCheck.checked = changes && changes.adstxtCheck ? changes.adstxtCheck : false
        homepageCheck.checked = changes && changes.homepageCheck ? changes.homepageCheck : false
        articleCheck.checked = changes && changes.articleCheck ? changes.articleCheck : false

        // Create an element for 'tags info', div containing errors per ad unit
        // and ads.txt check info
        let tagsH4 = document.getElementById('tagsInfo')
        if (tagsH4)
            removeNode(tagsH4)

        let adUnitErrsDiv = document.getElementById('adUnitErrs')
        if (adUnitErrsDiv)
            removeNode(adUnitErrsDiv)

        let adstxtH4 = document.getElementById('adstxt')
        if (adstxtH4)
            removeNode(adstxtH4)

        // In the beginning of the function call the information is cleared from the
        // popup.html and if the 'changes' parameter is empty than it's suposed to
        // stay empty
        if (!changes) return

        let tagsInfo = document.createElement('h4')
        tagsInfo.id = 'tagsInfo'

        if (changes && changes.adUnits && hasProperties(changes.adUnits)) {
            let adUnitErrs = document.createElement('div')
            adUnitErrs.id = 'adUnitErrs'

            tagsInfo.innerText = 'Tags info'

            let adUnits = changes.adUnits

            for (let adUnit in adUnits) {

                // Tooltip for GPT ID copy functionality
                let tooltip = document.createElement('div')
                tooltip.className = 'tooltip'
                let span = document.createElement('span')
                span.className = 'tooltiptext'
                span.id = adUnits[adUnit].ID + '_tooltip'

                // Create parent element per adunit
                let err = document.createElement('ul')

                // Create a child node per adunit errors
                err.innerText = adUnits[adUnit].name
                err.id = adUnits[adUnit].ID

                // More information is available when both checks, homepage and article,
                // have been made
                if (changes.articleCheck && changes.homepageCheck) {

                    if (!adUnits[adUnit].inArticle && !adUnits[adUnit].inHomepage) {
                        let msg = document.createElement('li')
                        msg.innerText = 'NOT found in BODY'
                        err.appendChild(msg)
                    } else if (!adUnits[adUnit].inArticle && adUnits[adUnit].inHomepage) {
                        err.innerText += ' (homepage only)'
                    } else if (adUnits[adUnit].inArticle && !adUnits[adUnit].inHomepage) {
                        err.innerText += ' (article only)'
                    }
                }

                // If inScript value is false it is shown in the popup display
                if (!adUnits[adUnit].inScript) {
                    let msg = document.createElement('li')
                    msg.innerText = 'NOT found in script'
                    err.appendChild(msg)
                }

                // Execute copy event
                err.onclick = function () {
                    let tooltip = document.getElementById(err.id + '_tooltip')
                    tooltip.parentElement.parentElement.classList.add('tooltipclicked')

                    document.execCommand("copy")
                }

                // Since nothing is selected on copy event execution GPT ID is taken for pasting
                // via this function
                err.addEventListener("copy", function (event) {
                    let copyText
                    event.preventDefault()
                    if (event.clipboardData) {
                        event.clipboardData.setData("text/plain", err.id)
                        copyText = event.clipboardData.getData("text")
                    }

                    // Tooltip appears with the text containing the ID
                    let tooltip = document.getElementById(err.id + '_tooltip')
                    tooltip.innerHTML = 'Copied: ' + copyText
                })

                // On mouseout hides the tooltip
                err.onmouseout = () => {
                    let tooltip = document.getElementById(err.id + '_tooltip')
                    tooltip.parentElement.parentElement.classList.remove('tooltipclicked')
                }

                // Tooltip container and span are required for proper display of tooltips
                err.appendChild(span)
                tooltip.appendChild(err)

                adUnitErrs.appendChild(tooltip)
                infoContainer.appendChild(tagsInfo)
                infoContainer.appendChild(adUnitErrs)
            }

            // If homepage and article checks have been made but the corresponding values
            // are false than display the no GPT found message.
            // changes is in the evaluation here just to avoid type errors
        } else if (changes && (changes.homepageCheck || changes.articleCheck)) {
            infoContainer.appendChild(tagsInfo)
            tagsInfo.innerText = 'No GPT ad units have been detected on this site'
        }

        let adstxt = document.createElement('h4')
        adstxt.id = 'adstxt'
        if (changes && changes.adstxtCheck && changes.adstxtMissingLines.length != 0) {
            adstxt.innerText = 'Ads.txt is missing ' + changes.adstxtMissingLines.length + ' lines'
            infoContainer.appendChild(adstxt)
        } else if (changes.adstxtCheck) {
            adstxt.innerText = 'Ads.txt file contains all the required lines'
            infoContainer.appendChild(adstxt)
        }
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
                    updateInfo()
                })
            }
        }
    }
    )
})