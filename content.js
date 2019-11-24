
var showAdUnits = function () {
    $('div[id^="div-gpt-ad-"]').css("display", "")
    $('div[id^="div-gpt-ad-"]').removeClass('hideAdUnits')
    $('div[id^="div-gpt-ad-"]').addClass('showAdUnits')
}

var unshowAdUnits = function () {
    $('div[id^="div-gpt-ad-"]').removeClass('showAdUnits')
}

var hideAdUnits = function () {
    $('div[id^="div-gpt-ad-"]').addClass('hideAdUnits')
}

var addListeners = function () {
    $(`<style>
    .showAdUnits {
        display: block;
        background-color: red;
    } 
    .hideAdUnits {
        display: none;
    }</style>`).appendTo("head");

    showAdUnits();
}

var removeListeners = function () {
    $(window).unbind('scroll');
    $('.showAdUnits').unbind('click');
    unshowAdUnits();
}

let extractScript = () => {
    let scriptUrl = ''
    $("script").each((_index, element) => {
        let src = element.getAttribute('src')
        if (src && src.search('adxbid') > -1) {
            scriptUrl = src
        }
    })

    if (scriptUrl) {
        chrome.runtime.sendMessage({ command: 'scriptUrl', url: scriptUrl }, (response) => {
            if (response)
                checkTags(response)
            else console.log('Failed to fetch the script!')
        })
    }
}

let checkTags = (script) => {
    // Returns an array of div-gpt tags from adxbid script
    let tagsFromScript = (scriptBody) => {
        let scriptTags = []
        if (scriptBody)
            scriptTags = scriptBody.match(/div-gpt-ad-[0-9]{13}-\d/g)

        return scriptTags
    }

    // Returns an array of div-gpt tags from DOM body
    let divsFromBody = () => {
        let bodyDivs = []
        let gptDivs = $("div[id^='div-gpt-ad-']")
        for (let tag of gptDivs) {
            bodyDivs.push(tag.id)
        }

        return bodyDivs
    }

    // Returns an array of div-gpt tags from DOM head
    let tagsFromHead = () => {
        let headTags = []

        for (let script of document.scripts) {
            if (script && headTags.length == 0) {
                adUnitIDs = script.textContent.match(/div-gpt-ad-[0-9]{13}-\d/g)
                adUnitNames = script.textContent.match(/(?<=googletag.defineSlot\('\/[0-9]{7,}\/).+(?=',)/gi)

                if (adUnitIDs) {
                    for (let i = 0; i < adUnitIDs.length; i++) {
                        headTags.push({
                            ID: adUnitIDs[i],
                            name: adUnitNames[i]
                        })
                    }

                }
            }

        }

        return headTags
    }

    //Returns an array of objects containing info about each tag
    let evaluateTags = (headTags, bodyDivs, scriptTags) => {
        let adUnitsInfo = []
        for (let headTag of headTags) {
            let originUrl = new URL(document.URL)
            let adUnitID = headTag.ID
            let adUnitName = headTag.name
            let adUnit = new AdUnit(adUnitID, adUnitName, originUrl.hostname)

            for (let scriptID of scriptTags) {
                if (adUnitID == scriptID)
                    adUnit.inScript = true
            }

            for (let bodyID of bodyDivs) {
                if (adUnitID == bodyID && originUrl.pathname == '/')
                    adUnit.inHomepageBody = true
                else if (adUnitID == bodyID && originUrl.pathname != '/')
                    adUnit.inArticleBody = true
            }

            // This is a signal that the information inside the Adunit object
            // has not been checked in this function call. It depends if current page
            // is homepage or article
            if (originUrl.pathname == '/')
                adUnit.inArticleBody = 'unchecked'
            if (originUrl.pathname != '/')
                adUnit.inHomepageBody = 'unchecked'

            adUnitsInfo.push(adUnit)
        }

        return adUnitsInfo
    }

    class AdUnit {
        constructor(ID, name, publisher) {
            this.sequence = AdUnit.count++
            this.publisher = publisher
            this.name = name
            this.ID = ID
            this.inHomepageBody = false
            this.inArticleBody = false
            this.inScript = false
        }
        static count = 1
    }

    let bodyDivs = divsFromBody()
    let headTags = tagsFromHead()
    let scriptTags = tagsFromScript(script)
    let adUnitsInfo = evaluateTags(headTags, bodyDivs, scriptTags)

    chrome.runtime.sendMessage({ command: 'adUnitsInfo', adUnitsInfo: adUnitsInfo })
}

//message listener for background
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    switch (request.command) {
        case 'highlight':
            addListeners()
            break
        case 'unhighlight':
            removeListeners()
            break
        case 'hide':
            hideAdUnits()
            break
        case 'checkTags':
            extractScript()
            break
    }

    sendResponse({ result: `Succes: ${request.command}` });
});



//on init perform based on chrome storage value
window.onload = function () {
    chrome.storage.sync.get('hide', function (data) {
        if (data.hide) {
            addListeners();
        } else {
            removeListeners();
        }
    });

}

