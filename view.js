// ts-nocheck
import * as utilities from './utilities.js'

// Update displayed info. When changes object is passed the function check
// if there are 'unchecked' keys, in which case the user should check them as
// suggested in the help text. The function appends the names of all adunits
// and displays brief error information
let update = (activeTabHostname) => {
    chrome.storage.sync.get(activeTabHostname, (data) => {
        let homeCheck = document.getElementById('homepageCheck'),
            articleCheck = document.getElementById('articleCheck'),
            adstxtCheck = document.getElementById('adstxtCheck'),
            infoContainer = document.getElementById('infoContainer')

        let changes = data[activeTabHostname]

        // Update checkboxes
        adstxtCheck.checked = changes && changes.adstxtCheck ? changes.adstxtCheck : false
        homeCheck.checked = changes && changes.homepageCheck ? changes.homepageCheck : false
        articleCheck.checked = changes && changes.articleCheck ? changes.articleCheck : false

        // Create an element for 'tags info', div containing errors per ad unit
        // and ads.txt check info
        let tagsH4 = document.getElementById('tagsInfo')
        if (tagsH4)
            utilities.removeNode(tagsH4)

        let adUnitErrsDiv = document.getElementById('adUnitErrs')
        if (adUnitErrsDiv)
            utilities.removeNode(adUnitErrsDiv)

        let adstxtH4 = document.getElementById('adstxt')
        if (adstxtH4)
            utilities.removeNode(adstxtH4)

        // In the beginning of the function call the information is cleared from the
        // popup.html and if the 'changes' parameter is empty than it's suposed to
        // stay empty
        if (!changes) return

        let tagsInfo = document.createElement('h4')
        tagsInfo.id = 'tagsInfo'

        if (changes && changes.adUnits && utilities.hasProperties(changes.adUnits)) {
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
                if (adUnits[adUnit].section.length == 0) {
                    let msg = document.createElement('li')
                    msg.innerText = 'NOT found in BODY'
                    err.appendChild(msg)
                } else {
                    let msg = ''
                    if (adUnits[adUnit].section.indexOf('homepage') >= 0) {
                        msg += 'homepage, '
                    }
                    if (adUnits[adUnit].section.indexOf('article') >= 0) {
                        msg += 'article, '
                    }
                    if (adUnits[adUnit].section.indexOf('category') >= 0) {
                        msg += 'category, '
                    }
                    if (msg) {
                        msg = msg.substring(0, msg.length - 2)
                        msg = '<strong> (' + msg + ') </strong>'
                        err.innerHTML += msg
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

export { update }