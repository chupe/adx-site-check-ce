var showAds = document.getElementById('showAds');
let hideAds = document.getElementById('hideAds');
let checkTags = document.getElementById('checkTags');
let bkg = chrome.extension.getBackgroundPage();

// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//     request.
// })

//on init update the UI checkbox based on storage
chrome.storage.sync.get('hide', function (data) {
    showAds.checked = data.hide;
});

showAds.onchange = function (element) {
    let value = this.checked;

    bkg.console.log("from popup")

    //update the extension storage value
    chrome.storage.sync.set({ 'hide': value }, function () {
        bkg.console.log('The value is' + value);
    });

    //Pass init or remove message to content script 
    if (value) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { command: "show", hide: value }, function (response) {
                bkg.console.log(response.result);
            });
        });
    } else {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { command: "unshow", hide: value }, function (response) {
                bkg.console.log(response.result);
            });
        });
    }

};

hideAds.onclick = function (element) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { command: "hide" }, function (response) {
            bkg.console.log(response.result);
        });
    });
}

checkTags.onclick = function (element) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { command: "checkTags" }, function (response) {
            bkg.console.log(response.result);
        });
    });
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {

        if (request.url) {
            bkg.console.log(request.url)
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

        } else if (request.tagsInfo) {
            
            chrome.storage.sync.set({ tagsInfo: request.tagsInfo }, () => {
                let tagsInfo = chrome.storage.sync.get("tagsInfo", (data) => {
                    bkg.console.log(data)
                    
                })
                tagsInfo()
            })
            
            sendResponse('OK')
        }
        return true
    }
)