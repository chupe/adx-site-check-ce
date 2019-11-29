let originUrl = new URL(document.URL)
let cssAppended = false
let adUnitsInfo
let adUnits = $('div[id^="div-gpt-ad-"]')

// Fill adunit.sizes. Regexp to match the sizes array, than to match
// individual size pair, parsed as ints and sorted according to surface area.
let extractSizes = (name) => {
    let scripts = document.scripts

    // Prepare adunit.name to be used inside regexp obj
    name = name.replace('.', '\\.')
    let regex = new RegExp("(?<=/" + name + "', ?\\[ ?).+(?= ?\\] ?, ?)", 'g')
    let sizes = ''
    for (let script of scripts) {
        // If there is a script and sizes array hasnt been populated yet
        if (script && !sizes) {
            sizes = script.textContent.match(regex)
            if (sizes) {
                let reg = new RegExp(", ?", 'g')
                // If ad unit has one size it does not have two pairs of braces,
                // and requires different approach to turn it into array of int
                if (!sizes[0].match(/\[[0-9]{3},[ ]*[0-9]{2,}\]/g)) {
                    sizes = sizes[0].split(reg)
                    sizes = [parseInt(sizes[0]), parseInt(sizes[1])]
                    sizes = [sizes]
                } else {
                    sizes = sizes[0].match(/\[[0-9]{3},[ ]*[0-9]{2,}\]/g)
                    sizes = sizes.map((size) => {
                        size = size.replace(/[\[ \])]?/g, '')
                        size = size.split(reg)
                        size[0] = parseInt(size[0])
                        size[1] = parseInt(size[1])

                        return size
                    })

                    // Sort according to surface area of adunit
                    sizes.sort((a, b) => {
                        return b[0] * b[1] - a[0] * a[1]
                    })
                }
            }
        }
    }

    return sizes
}

// Converts sizes array to a string in a readable format
let sizesAsText = (adUnit) => {
    let sizesAsText = ''
    for (let size of adUnit.sizes) {
        size = size.toString()
        sizesAsText += '[' + size + '], '
    }

    return sizesAsText.substring(0, sizesAsText.length - 2)
}

// Add css to make adunits visible even when they are unfilled
let highlightAdUnits = function () {
    adUnits.css("display", "")
    adUnits.removeClass('hideAdUnits')
    adUnits.addClass('highlightAdUnits')

    let sizeAdUnits = (adUnitsInfo) => {
        adUnits.each((_index, element) => {
            let adUnitText = ''
            let name = ''
            let height = 0
            let width = 0

            // The adunit is susposed to contain the name and all
            // sizes as innerHTML
            for (let adUnit in adUnitsInfo) {
                let elementId = element.getAttribute('id')
                let currentAdUnit = adUnitsInfo[adUnit]

                // Since div contains only ID and adUnitsInfo object
                // has names as keys the adUnitsInfo object need to be
                // matched by ID and accessed by adunit name
                if (elementId == currentAdUnit.ID) {
                    let sizes = sizesAsText(currentAdUnit)
                    name = currentAdUnit.name
                    adUnitText = `${name}<br>${sizes}`
                    height = currentAdUnit.sizes[0][1] + 'px'
                    width = currentAdUnit.sizes[0][0] + 'px'
                }
            }
            element.title = name
            element.style.height = height
            element.style.width = width
            element.innerHTML = adUnitText
        })
        adUnits.on('click', changeSize)
    }

    if (adUnitsInfo) {
        sizeAdUnits(adUnitsInfo)
    } else {
        extractScript()
        setTimeout(() => {
            sizeAdUnits(adUnitsInfo)
        }, 100)
    }
}

// Remove css that makes adunits highlighted
let unhighlightAdUnits = function () {
    adUnits.removeClass('highlightAdUnits')
}

// Hide all adunits
let hideAdUnits = function () {
    adUnits.addClass('hideAdUnits')
}

// Callback to adunits.onclick,
// changes size of highlighted adunit in descending order 
// of adunit.sizes array
let changeSize = function () {
    let sizes = adUnitsInfo[$(this).attr('title')].sizes
    let width = $(this).width()
    let height = $(this).height()
    for (let size of sizes) {
        if (width * height > size[0] * size[1]) {
            $(this).width(size[0])
            $(this).height(size[1])
            break
        }
    }
}

// Append custom CSS and listeners. Check before appending if it has been
// appended before
let addListeners = function () {
    if (!cssAppended) {
        $(`<style>
                .highlightAdUnits {
                    display: block;
                    background-color: red;
                    text-align: center;
                } 
                .hideAdUnits {
                    display: none;
                }</style>`).appendTo("head")
        cssAppended = true
    }

    highlightAdUnits()
}

let removeListeners = function () {
    unhighlightAdUnits()
}

// Find adxbid script inside the script tags by iterating them
// with each and searching a string. If found sendMessage for popup.js
// to download the script, else call checkTags with '' so it skips
// looking for tags inside script
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
    } else checkTags('')
}

// Returns an array of div-gpt tags from adxbid script
// unless parameter is missing. If so returns empty array
let tagsFromScript = (scriptBody) => {
    let scriptTags = ''
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

    // Iterate over all scripts in the head and match id
    // and name
    for (let script of document.scripts) {
        if (script) {// && headTags.length == 0) {
            let tempIDs = []
            let tempNames = []
            let adUnitIDs = []
            let adUnitNames = []

            tempIDs = script.textContent.match(/div-gpt-ad-[0-9]{13}-\d/g)
            if (tempIDs) {
                for (let ID of tempIDs)
                    adUnitIDs.push(ID)
            }

            tempNames = script.textContent.match(/(?<=googletag.defineSlot\('\/[0-9]{7,}\/).+(?=',)/gi)
            if (tempNames) {
                for (let name of tempNames)
                    adUnitNames.push(name)
            }

            if (adUnitIDs) {
                for (let i = 0; i < adUnitIDs.length; i++) {
                    // If there are additional unnamed tags found in body
                    // they will not be part of the adunitsinfo object
                    if (!adUnitNames[i])
                        continue
                    // In rare cases when sizes array contains 'fluid'
                    // the name isnt matched correctly. When this is the case
                    // the name is substringed up to the first occurence of - ', marking
                    // the end of actual adunit name
                    if (adUnitNames[i].search("',") > -1)
                        adUnitNames[i] = adUnitNames[i].substring(0, adUnitNames[i].search("',"))
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

// Returns an array of objects containing info about each tag.
// Object keys are named by adunit names. The function iterates over
// headTags and compares with body and script arrays
let evaluateTags = (headTags, bodyDivs, scriptTags) => {
    let adUnitsInfo = {}
    for (let headTag of headTags) {
        let adUnitID = headTag.ID
        let adUnitName = headTag.name
        let adUnit = new AdUnit(adUnitID, adUnitName, originUrl.hostname)

        for (let scriptID of scriptTags) {
            if (adUnitID == scriptID)
                adUnit.inScript = true
        }

        for (let bodyID of bodyDivs) {
            if (adUnitID == bodyID && originUrl.pathname == '/')
                adUnit.inHomepage = true
            else if (adUnitID == bodyID && originUrl.pathname != '/')
                adUnit.inArticle = true
        }

        adUnit.sizes = extractSizes(adUnit.name)
        adUnitsInfo[adUnit.name] = adUnit
    }

    return adUnitsInfo
}

// Contains three functions to get information in the form of an array
// from the script, head and body sections. After it has been completed
// the resulting arrays go inside evaluateTags.
let checkTags = (script, callback) => {
    let bodyDivs = divsFromBody()
    let headTags = tagsFromHead()
    let scriptTags = tagsFromScript(script)

    let adUnitsInfo = evaluateTags(headTags, bodyDivs, scriptTags)

    let publisher = new Publisher(originUrl.hostname, adUnitsInfo)

    if (originUrl.pathname != '/')
        publisher.articleCheck = true
    else publisher.homepageCheck = true

    // Upon completion the adUnitsInfo object is passed to the popup.js
    chrome.runtime.sendMessage({ command: 'publisher', publisher: publisher })

    adUnitsInfo = publisher.adUnits
}


class Publisher {
    constructor(name, adUnits) {
        this.adUnits = adUnits
        this.name = name

        if (originUrl.pathname == '/')
            this.homepageCheck = true
        else
            this.articleCheck = true
    }
    adstxtMissingLines
    articleCheck
    homepageCheck
    highlight
    adstxtCheck
}

class AdUnit {
    constructor(ID, name, publisher) {
        this.publisher = publisher
        this.name = name
        this.ID = ID
        this.inHomepage = false
        this.inArticle = false
        this.inScript = false
        this.sizes = []
    }
}

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
        default:
            sendResponse({ result: "Unrecognized request.command" })
    }

    sendResponse({ result: `Succes: ${request.command}` })
})

chrome.storage.onChanged.addListener(() => {
    chrome.storage.sync.get(originUrl.hostname, (data) => {
        if (data[originUrl.hostname])
            adUnitsInfo = data[originUrl.hostname].adUnits
        else adUnitsInfo = undefined
    })
})

//on init perform based on chrome storage value
window.onload = () => {
    chrome.storage.sync.get(originUrl.hostname, (data) => {
        if (data[originUrl.hostname]) {
            adUnitsInfo = data[originUrl.hostname].adUnits
        }
    })
}

