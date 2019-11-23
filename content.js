
//find all the image in answer feed,thumbnail and ad feeds and add blurclasses
var showAds = function () {
    $('div[id^="div-gpt-ad-"]').css("display", "")
    $('div[id^="div-gpt-ad-"]').removeClass('hideAds')
    $('div[id^="div-gpt-ad-"]').addClass('showAds')
}

//find all the image in answer feed,thumbnail and ad feeds and remove blurclasses
var unshowAds = function () {
    $('div[id^="div-gpt-ad-"]').removeClass('showAds')
}

var hideAds = function () {
    $('div[id^="div-gpt-ad-"]').addClass('hideAds')
}

var addListeners = function () {
    $(`<style>
    .showAds {
        display: block;
        background-color: red;
    } 
    .hideAds {
        display: none;
    }</style>`).appendTo("head");

    showAds();
}

var removeListeners = function () {
    $(window).unbind('scroll');
    $('.showAds').unbind('click');
    unshowAds();
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
        chrome.runtime.sendMessage({ url: scriptUrl }, (response) => {
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
    let tagsFromBody = () => {
        let bodyTags = []
        let gptDivs = $("div[id^='div-gpt-ad-']")
        for (let tag of gptDivs) {
            bodyTags.push(tag.id)
        }

        return bodyTags
    }

    // Returns an array of div-gpt tags from DOM head
    let tagsFromHead = () => {
        let headTags = []

        for (let script of document.scripts) {
            if (script && headTags.length == 0) {
                headIDs = script.textContent.match(/div-gpt-ad-[0-9]{13}-\d/g)
                tagNames = script.textContent.match(/(?<=googletag.defineSlot\('\/[0-9]{7,}\/).+(?=',)/gi)

                if (headIDs) {
                    for (let i = 0; i < headIDs.length; i++) {
                        headTags.push({
                            tagID: headIDs[i],
                            tagName: tagNames[i]
                        })
                    }

                }
            }

        }

        return headTags
    }

    //Returns an array of objects containing info about each tag
    let evaluateTags = (headTags, bodyTags, scriptTags) => {
        let tagsInfo = []
        for (let headTag of headTags) {
            let originUrl = new URL(document.URL)
            let headID = headTag.tagID
            let tagName = headTag.tagName
            let tag = new Tag(headID, tagName)

            for (let scriptID of scriptTags) {
                if (headID == scriptID)
                    tag.inScript = true
            }

            for (let bodyID of bodyTags) {
                if (headID == bodyID && originUrl.pathname == '/')
                    tag.inHomepageBody = true
                else if (headID == bodyID && originUrl.pathname != '/')
                    tag.inArticleBody = true
            }

            if (originUrl.pathname == '/') 
                tag.inArticleBody = 'unckecked'
            if (originUrl.pathname != '/') 
                tag.inHomepageBody = 'unckecked'

            tagsInfo.push(tag)
        }

        return tagsInfo
    }

    class Tag {
        constructor(headID, tagName) {
            this.sequence = Tag.count++
            this.tagName = tagName,
                this.ID = headID
            this.inHomepageBody = false
            this.inArticleBody = false
            this.inScript = false
        }
        static count = 1
    }

    let bodyTags = tagsFromBody()
    let headTags = tagsFromHead()
    let scriptTags = tagsFromScript(script)
    let tagsInfo = evaluateTags(headTags, bodyTags, scriptTags)

    chrome.runtime.sendMessage({ tagsInfo: tagsInfo }, (response) => {
        console.log(response)
    })
}

//message listener for background
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.command === 'show') {
        addListeners();
    } else if (request.command === 'unshow') {
        removeListeners();
    } else if (request.command === 'hide') {
        hideAds();
    } else if (request.command === 'checkTags') {
        extractScript();
    } else if (request.script) {
        (request.script)
    }
    sendResponse({ result: "success" });
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

