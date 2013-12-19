let http = new Http

item = {
    name: 'mypak',
    uri: 'https://github.com/embedthis/pak-mpr-1.git',
    key: '317367f1a8d013cc47c52b43e90d5855'
}

/*
http.get(':5000/do/catalog/1')
let xsrf = http.headers['X-XSRF-TOKEN']
print(xsrf)
http.setHeader('X-XSRF-TOKEN', xsrf)
*/

dump(item)
http.setHeader('Content-Type', 'application/json')
http.post(':5000/do/catalog/publish/', serialize(item))
print(http.response)
