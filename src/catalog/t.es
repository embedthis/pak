let http = new Http

item = {
    name: 'aaa',
    uri: 'https://github.com/embedthis/pak-aaa.git',
    key: '1234'
}

/*
http.get(':5000/do/pak/1')
let xsrf = http.headers['X-XSRF-TOKEN']
print(xsrf)
http.setHeader('X-XSRF-TOKEN', xsrf)
*/

http.setHeader('Content-Type', 'application/json')
http.post(':5000/do/pak/publish/', serialize(item))
print(http.response)
