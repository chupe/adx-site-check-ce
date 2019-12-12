class Publisher {
    constructor(name, adUnits) {
        this.adUnits = adUnits
        this.name = name
    }
    adstxtMissingLines
    categoryCheck
    articleCheck
    homepageCheck
    highlight
    adstxtCheck
    scriptUrl
}

class AdUnit {
    constructor(ID, name, publisher) {
        this.publisher = publisher
        this.name = name
        this.ID = ID
        this.section = [] // 'article', 'homepage', 'category'
        this.inScript = false
        this.sizes = []
    }

    setSection(section) {
        if (['article', 'homepage', 'category'].indexOf(section) == -1)
            throw new Error('Section property on the ad unit does not match')

        if (this.section.indexOf(section) == -1)
            this.section.push(section)
    }
}

export { Publisher, AdUnit }