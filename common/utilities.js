// () => {
//     return {

//     }
// }
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
                    resolve(doc)
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

function formatForStore(publisher, data) {
    let json = {}
    json[publisher] = data
    return json
}

let getHostname = () => {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            let activeTabHostname = new URL(tabs[0].url).hostname
            return resolve(activeTabHostname)
        })
    })
}

export { fetchFromUrl, removeNode, hasProperties, formatForStore, getHostname }