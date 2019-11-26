let originUrl = new URL(document.URL)
let cssAppended = false

chrome.storage.sync.get(originUrl.hostname, (data) => {
    let adUnitsInfo = data

    let adUnits = $('div[id^="div-gpt-ad-"]')

    let extractSizes = (name) => {
        let scripts = document.scripts
        name = name.replace('.', '\\.')
        let regex = new RegExp("(?<=/" + name + "', ?\\[ ?).+(?= ?\\] ?, ?)", 'g')
        let sizes = ''
        for (let script of scripts) {
            if (script && !sizes) {
                sizes = script.textContent.match(regex)
                if (sizes) {
                    let reg = new RegExp(", ?", 'g')
                    // If ad unit has one size it does not have braces,
                    //and requires different approach to turn it into array of int
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
                        sizes.sort((a, b) => {
                            return a[0] * a[1] - b[0] * b[1]
                        })
                        sizes.reverse()
                    }
                }
            }
        }

        return sizes
    }

    let sizesAsText = (adUnit) => {
        let sizesAsText = ''
        for (let size of adUnit.sizes) {
            size = size.toString()
            sizesAsText += '[' + size + '], '
        }

        return sizesAsText.substring(0, sizesAsText.length - 2)
    }

    let refreshAdUnitsInfo = () => {
        chrome.storage.sync.get(originUrl.hostname, (data) => {
            adUnitsInfo = data
        })
    }


    let highlightAdUnits = function () {
        adUnits.css("display", "")
        adUnits.removeClass('hideAdUnits')
        adUnits.addClass('highlightAdUnits')

        chrome.storage.sync.get(originUrl.hostname, (data) => {
            adUnitsInfo = data
            adUnits.each((_index, element) => {
                let adUnitText = ''
                let name = ''
                let height = 0
                let width = 0

                for (let adUnit in adUnitsInfo[originUrl.hostname]) {
                    let elementId = element.getAttribute('id')
                    let currentAdUnit = adUnitsInfo[originUrl.hostname][adUnit]
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
        })
    }

    let unhighlightAdUnits = function () {
        adUnits.removeClass('highlightAdUnits')
        adUnits.text('')
    }

    let hideAdUnits = function () {
        adUnits.addClass('hideAdUnits')
    }

    let changeSize = function () {
        let sizes = adUnitsInfo[originUrl.hostname][$(this).attr('title')].sizes
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

        adUnits.on('click', changeSize)
        highlightAdUnits()
    }

    let removeListeners = function () {
        unhighlightAdUnits();
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

                adUnit.sizes = extractSizes(adUnit.name)
                adUnitsInfo[adUnit.name] = adUnit
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
                this.sizes = []
            }
            static count = 1
        }

        let bodyDivs = divsFromBody()
        let headTags = tagsFromHead()
        let scriptTags = tagsFromScript(script)
        let adUnitsInfo = evaluateTags(headTags, bodyDivs, scriptTags)

        chrome.runtime.sendMessage({ command: 'adUnitsInfo', adUnitsInfo: adUnitsInfo })
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

    //on init perform based on chrome storage value
    window.onload = function () {
        chrome.storage.sync.get('highlight', function (data) {
            if (data.hide) {
                addListeners()
            } else {
                removeListeners()
            }
        })
    }


})