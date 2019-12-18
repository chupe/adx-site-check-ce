import { AdUnit, Publisher } from './entities.js'
import * as utilities from '../common/utilities.js'
import * as storage from '../common/storage.js'

// Fill adunit.sizes. Regexp to match the sizes array, than to match
// individual size pair, parsed as ints and sorted according to surface area.
let extractSizes = (name, definitionLine) => {

    // Prepare adunit.name to be used inside regexp obj
    name = name.replace('.', '\\.')
    let regex = new RegExp("(?<=/" + name + "', ?\\[ ?).+(?= ?\\] ?, ?)", 'g')
    let sizes

    sizes = definitionLine.match(regex)
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

            // Sort according to surface area of an ad unit
            sizes.sort((a, b) => {
                return b[0] * b[1] - a[0] * a[1]
            })
        }
    }

    return sizes
}

let matchSourceInfo = function (sourceCode) {
    let adUnitIDs = []
    let adUnitNames = []
    let adUnitSizes = []
    let headTags = []
    // let tempNames = []
    // let tempIDs = []

    // Get rid of HTML comments
    sourceCode = sourceCode.replace(/<!--[\s\S]*?-->/gi, '')

    let scriptLines = sourceCode.match(/(?<!\/\/)googletag.defineSlot\('\/[\S\s]*?(?=\)\.addService\(googletag.pubads\(\)\))/gi)

    if (utilities.isIterable(scriptLines)) {
        for (let line of scriptLines) {
            let tempName = line.match(/(?<=googletag.defineSlot\('\/\d{7,}\/).+?(?=',)/gi)
            let tempID = line.match(/(?<=], ?')div-gpt-ad-\d{13}-\d{1,2}(?=')/g)
            let sizes = extractSizes(tempName[0], line)
            if (sizes)
                adUnitSizes.push(sizes)
            if (tempName[0])
                adUnitNames.push(tempName[0])
            if (tempID[0])
                adUnitIDs.push(tempID[0])
        }
    } else console.log('Defining line in script tags have not been found (googletag.defineSlot)')

    if (adUnitIDs) {
        for (let i = 0; i < adUnitIDs.length; i++) {

            // In rare cases when sizes array contains 'fluid'
            // the name isnt matched correctly. When this is the case
            // the name is substringed up to the first occurence of - ', marking
            // the end of actual adunit name
            if (adUnitNames[i].search("',") > -1)
                adUnitNames[i] = adUnitNames[i].substring(0, adUnitNames[i].search("',"))
            headTags.push({
                ID: adUnitIDs[i],
                name: adUnitNames[i],
                sizes: adUnitSizes[i]
            })
        }
    }

    let bodyDivs = sourceCode.match(/(?<=<div.+id= ?["'])div-gpt-ad-\d{13}-\d{1,2}(?=["'])/g)

    let htmlTags = {
        headTags: headTags,
        bodyDivs: bodyDivs
    }

    return htmlTags
}

let getScriptUrl = async (sourceCode) => {
    let hostname = await utilities.getHostname()
    let scriptUrl = sourceCode.match(/https:\/\/adxbid\.(info|me)\/[\S]+\.js/gi)
    storage.update({
        name: hostname,
        scripts: scriptUrl
    })
    if (Array.isArray(scriptUrl))
        return scriptUrl[0]
    else return scriptUrl
}

// Returns an array of div-gpt tags from DOM body
let tagsFromSources = (pageUrl) => {
    let url = new URL(pageUrl)

    return utilities.fetchFromUrl(url)
        .then(async (sourceCode) => {
            let scriptUrl = await getScriptUrl(sourceCode)
            let scriptSource = await utilities.fetchFromUrl(scriptUrl)

            return {
                sourceCode,
                scriptSource
            }
        }).then(
            (sources) => {
                let { sourceCode, scriptSource } = sources
                let { headTags, bodyDivs } = matchSourceInfo(sourceCode)
                let scriptTags

                if (scriptSource) {
                    scriptTags = scriptSource.match(/(?<=code: ?')div-gpt-ad-\d{13}-\d{1,2}(?=')/g)
                    if (!scriptTags)
                        console.log('No tags found in the script')
                } else
                    console.log('Script can not be downloaded from the url provided')

                return {
                    headTags,
                    bodyDivs,
                    scriptTags
                }
            }
        )
}

// Returns an array of objects containing info about each tag.
// Object keys are named by adunit names. The function iterates over
// headTags and compares with body and script arrays
let evaluateTags = (headTags, bodyDivs, scriptTags, publisher, section) => {
    let adUnitsInfo = {}
    for (let headTag of headTags) {
        let adUnitID = headTag.ID
        let adUnitName = headTag.name
        let adUnit = new AdUnit(adUnitID, adUnitName, publisher)

        adUnit.sizes = headTag.sizes

        if (utilities.isIterable(scriptTags))
            for (let scriptID of scriptTags) {
                if (adUnitID == scriptID)
                    adUnit.inScript = true
            }

        if (utilities.isIterable(bodyDivs))
            for (let bodyID of bodyDivs) {
                if (adUnitID == bodyID)
                    adUnit.setSection(section)
            }

        adUnitsInfo[adUnit.name] = adUnit
    }

    if (utilities.hasProperties(adUnitsInfo))
        return adUnitsInfo
    else
        return undefined
}

let checkPageTags = async (url) => {
    let fmtURL = new URL(url)
    let publisher = fmtURL.hostname
    let { headTags, bodyDivs, scriptTags } = await tagsFromSources(url)

    let publisherObj = new Publisher(publisher)

    let section = ''

    if (fmtURL.pathname != '/') {
        section = 'article'
        publisherObj.articleCheck = true
    }
    else {
        section = 'homepage'
        publisherObj.homepageCheck = true
    }
    let adUnitsInfo = evaluateTags(headTags, bodyDivs, scriptTags, publisher, section)

    publisherObj.adUnits = adUnitsInfo

    storage.update(publisherObj)
}

export { checkPageTags }