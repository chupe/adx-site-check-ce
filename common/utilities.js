function fetchFromUrl(url) {
    return new Promise((resolve, reject) => {
        if (!url)
            reject('Url to fetch has not been provided')
        else {
            let xhr = new XMLHttpRequest()
            xhr.open('GET', url, true)
            xhr.responseType = 'text'
            xhr.addEventListener("loadend", function () {
                let doc = this.responseText
                if (this.status == 404)
                    reject('Fetch from url failed to load the source! Status: ' + this.status)
                else
                    resolve({ doc, url })
            })
            xhr.send()
        }
    })
}

// Function to remove HTML nodes completly since they only get hidden
// and child elements are stacking upon each apppendChild call
function removeNode(node) {
    while (node.lastChild) {
        node.removeChild(node.lastChild)
    }
    node.remove()
}

// Check if an object is empty or has properties
function hasProperties(obj) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop))
            return true
    }
}

let getHostname = () => {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) return reject('Unable to fetch active tab')
            let activeTabHostname = new URL(tabs[0].url).hostname
            return resolve(activeTabHostname)
        })
    })
}

function isIterable(obj) {
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

export { fetchFromUrl, removeNode, hasProperties, getHostname, isIterable }