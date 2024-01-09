
var url = require('url');
var sqlite3 = require('sqlite3').verbose(); //verbose provides more detailed stack trace
var db = new sqlite3.Database('data/db_1200iRealSongs');



exports.authenticate = function (request, response, next){
    /*
	Middleware to do BASIC http 401 authentication
	*/
    var auth = request.headers.authorization;
	// auth is a base64 representation of (username:password)
	//so we will need to decode the base64
	if(!auth){
 	 	//note here the setHeader must be before the writeHead
		response.setHeader('WWW-Authenticate', 'Basic realm="need to login"');
        response.writeHead(401, {'Content-Type': 'text/html'});
		console.log('No authorization found, send 401.');
 		response.end();
	}
	else{
	    console.log("Authorization Header: " + auth);
        //decode authorization header
		// Split on a space, the original auth
		//looks like  "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd part
        var tmp = auth.split(' ');

		// create a buffer and tell it the data coming in is base64
        var buf = Buffer.from(tmp[1], 'base64');

        // read it back out as a string
        //should look like 'ldnel:secret'
		var plain_auth = buf.toString();
        console.log("Decoded Authorization ", plain_auth);

        //extract the userid and password as separate strings
        var credentials = plain_auth.split(':');      // split on a ':'
        var username = credentials[0];
        var password = credentials[1];
        console.log("User: ", username);
        console.log("Password: ", password);

		var authorized = false;
		//check database users table for user
		db.all("SELECT userid, password, role FROM users", function(err, rows){
		for(var i=0; i<rows.length; i++){
		      if(rows[i].userid == username & rows[i].password == password){
				authorized = true;
				request.user_role = rows[i].role;
			  }
			  
		}
		if(authorized == false){
 	 	   //we had an authorization header by the user:password is not valid
		   response.setHeader('WWW-Authenticate', 'Basic realm="need to login"');
           response.writeHead(401, {'Content-Type': 'text/html'});
		   console.log('No authorization found, send 401.');
 		   response.end();
		}
        else
		  next();
		});
	}

	//notice no call to next()

}
function addHeader(request, response){
        // about.html
        var title = 'COMP 2406:';
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write('<!DOCTYPE html>');
        response.write('<html><head><title>About</title></head>' + '<body>');
        response.write('<h1>' +  title + '</h1>');
		response.write('<hr>');
}

function addFooter(request, response){
 		response.write('<hr>');
		response.write('<h3>' +  'Carleton University' + '</h3>');
		response.write('<h3>' +  'School of Computer Science' + '</h3>');
        response.write('</body></html>');

}



exports.index = function (request, response){
        // index.html
	     response.render('index', { title: 'SONGS', body: 'ENTER SONGS INSIDE URL || ENTER USERS TO ACCESS SONGS'});
}

function parseURL(request, response){
	var parseQuery = true; //parseQueryStringIfTrue
    var slashHost = true; //slashDenoteHostIfTrue
    var urlObj = url.parse(request.url, parseQuery , slashHost );
    console.log('path:');
    console.log(urlObj.path);
    console.log('query:');
    console.log(urlObj.query);
    //for(x in urlObj.query) console.log(x + ': ' + urlObj.query[x]);
	return urlObj;

}

exports.users = function(request, response){
	console.log('USER ROLE: ' + request.user_role);
        // users.html
		if(request.user_role == 'admin'){
			db.all("SELECT userid, password FROM users", function(err, rows) {
				response.render('users', {title : 'Users:', userEntries: rows});
			  
			})
			}else{
			  response.write(`<p>ERROR: Admin Privileges Needed to see Users </p>`)
		  
			}

}

exports.find = function (request, response){
        // find.html
		console.log("RUNNING FIND SONGS");

		var urlObj = parseURL(request, response);
		var sql = "SELECT id, title FROM songs";

    if (urlObj.query['title']) {
      let keywords = urlObj.query['title']
      keywords = keywords.replace(/\s/g, '%')
      console.log("finding title: " + keywords);
      sql = "SELECT id, title FROM songs WHERE title LIKE '%" +
        keywords + "%'"
    }

		db.all(sql, function(err, rows){
	       response.render('songs', {title: 'Songs:', songEntries: rows});
 		});
}
exports.songDetails = function(request, response){

	    var urlObj = parseURL(request, response);
        var songID = urlObj.path; //expected form: /song/235
		songID = songID.substring(songID.lastIndexOf("/")+1, songID.length);

		var sql = "SELECT id, title, composer, key, bars FROM songs WHERE id=" + songID;
        console.log("GET SONG DETAILS: " + songID );

		db.all(sql, function(err, rows){
		let song = rows[0];
		song.individualBars = [];
		song.individualBars = song.bars.replace("||","|").replace(" |]"," |").replace("||[", "|[").split("|");
		song.bars = song.bars.replace("||","|").replace(" |]"," |").replace("||[", "|[")
		console.log("songs before"+song.bars);
		var tempArr =[];
		while(song.individualBars.length >0){
			tempArr.push(song.individualBars.splice(0,4));
		}
		song.individualBars = tempArr;
        console.log('Song Data');
        console.log(rows);
		console.log(song);
		response.render('songDetails', {title: 'Songs Details:', song: song});
		});

}

exports.create = function(request, response){

	
	
	var sql = "INSERT OR REPLACE INTO users VALUES ('alfred', '12345', 'guest')"
	db.run(sql)
	response.render('account', {title: 'Account creation:', username: 'alfred', password: '12345' });
}
