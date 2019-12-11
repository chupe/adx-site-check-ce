export function fetchFromUrl(url) {
    return new Promise((resolve, reject) => {
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
    })
}