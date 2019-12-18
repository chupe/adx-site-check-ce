// Pass to the function the information from the content script and the origin url so it can be
// saved in storage under publisher name key
let update = (update) => {
    return new Promise((resolve, reject) => {

        // let publisher = Object.keys(update)[0]
        let publisher = update.name
        let newData = update
        chrome.storage.sync.get(publisher, (data) => {
            let oldData = data[publisher]
            if (!oldData) {
                let json = {}
                newData.name = publisher
                json[publisher] = newData
                chrome.storage.sync.set(json, () => {
                    resolve()
                })
            } else {
                // Here the rest of the properties are iterated over and updated
                for (let info in newData) {
                    // Do not update adUnits property
                    if (info == 'adUnits')
                        continue

                    // Normaly is a property is set once to true it is not
                    // suposed to be overwritten as a false or undefined
                    if (newData[info])
                        oldData[info] = newData[info]

                    // Highlight differs from other properties in that it is
                    // suposed to be changed frequently and not set (to true) once
                    if (info == 'highlight')
                        oldData[info] = newData[info]
                }

                //Ad units are an object inside an object and are iterated separately
                let oldAdUnits = oldData.adUnits
                let newAdUnits = newData.adUnits
                if (newAdUnits) {
                    let homepageCheck = newData.homepageCheck
                    let articleCheck = newData.articleCheck

                    // Values for inHomepage and inArticle should be modified only if the
                    // update homepageCheck = true or articleCheck = true
                    if (oldAdUnits) {
                        for (let adUnit in newAdUnits) {
                            if (newAdUnits[adUnit]) {
                                if (!oldAdUnits[adUnit]) {
                                    oldAdUnits[adUnit] = newAdUnits[adUnit]
                                }
                                for (let details in newAdUnits[adUnit]) {
                                    if (details == 'section') {
                                        if (homepageCheck
                                            && newAdUnits[adUnit][details].indexOf('homepage') >= 0
                                            && oldAdUnits[adUnit][details].indexOf('homepage') == -1)
                                            oldAdUnits[adUnit][details].push('homepage')

                                        if (articleCheck
                                            && newAdUnits[adUnit][details].indexOf('article') >= 0
                                            && oldAdUnits[adUnit][details].indexOf('article') == -1)
                                            oldAdUnits[adUnit][details].push('article')

                                        continue
                                    }
                                    // If inScript has been set to true do not set it to
                                    // false if in another context the script tags are not present
                                    if (details == 'inScript' && oldAdUnits[adUnit][details])
                                        continue
                                    oldAdUnits[adUnit][details] = newAdUnits[adUnit][details]
                                }
                            }
                        }
                    } else {
                        oldData.adUnits = newAdUnits
                    }
                }

                let json = {}
                json[publisher] = oldData

                chrome.storage.sync.set(json, () => {
                    resolve()
                })
            }
        })
    })
}

let showDetails = async (publisher) => {

    let bkg = chrome.extension.getBackgroundPage()

    let getActiveTab = () => {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                let activeTabHostname = new URL(tabs[0].url).hostname
                resolve(activeTabHostname)
            })
        })
    }
    if (!publisher) {
        publisher = await getActiveTab()
    }

    chrome.storage.sync.get(publisher, (data) => {
        // The detailed information about the current site is displayed
        // inside extension console
        bkg.console.log(publisher, data[publisher])
    })
}

export { update, showDetails }