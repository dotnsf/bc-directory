//. app.js

//. Run following command to deploy business network before running this app.js
//. $ composer network deploy -p hlfv1 -a ./bc-directory.bna -i PeerAdmin -s secret

var express = require( 'express' ),
    basicAuth = require( 'basic-auth-connect' ),
    cfenv = require( 'cfenv' ),
    multer = require( 'multer' ),
    bodyParser = require( 'body-parser' ),
    fs = require( 'fs' ),
    ejs = require( 'ejs' ),
    http = require( 'http' ),
    uuid = require( 'node-uuid' ),
    jwt = require( 'jsonwebtoken' ),
    app = express();
var settings = require( './settings' );
var appEnv = cfenv.getAppEnv();

const HyperledgerClient = require( './hyperledger-client' );
const client = new HyperledgerClient();

app.set( 'superSecret', settings.superSecret );

var port = appEnv.port || 3000;

app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );

app.all( '/apidoc', basicAuth( function( user, pass ){
  return ( user === settings.basic_username && pass === settings.basic_password );
}));
app.use( express.static( __dirname + '/public' ) );

app.get( '/', function( req, res ){
  res.write( '/apidoc for API Document' );
  res.end();
});

var apiRoutes = express.Router();

apiRoutes.post( '/login', function( req, res ){
  var id = req.body.id;
  var password = req.body.password;
  //console.log( 'id=' + id + ',password=' + password);
  client.getUserForLogin( id, user => {
    if( user.password == password ){
      var token = jwt.sign( user, app.get( 'superSecret' ), { expiresIn: '24h' } );
      //console.log( 'token=' + token);
      client.createUserTx( user, result => {
        console.log( 'createUserTx success: ' + JSON.stringify( result, 2, null ) );

        //. Log 
        var body = 'User: ' + user.name + '(' + user.id + ') Logged in.';
        var user_id = user.id;
        createLog( body, user_id );

        res.write( JSON.stringify( { status: true, token: token }, 2, null ) );
        res.end();
      }, error => {
        console.log( 'createUserTx error: ' + JSON.stringify( error, 2, null ) );
        res.write( JSON.stringify( { status: true, token: token }, 2, null ) );
        res.end();
      });
    }else{
      res.status( 401 );
      res.write( JSON.stringify( { status: false, message: 'Not valid id/password.' }, 2, null ) );
      res.end();
    }
  }, error => {
    console.log( 'getUserForLogin error: ' + JSON.stringify( error, 2, null ) );
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: 'Not valid id/password.' }, 2, null ) );
    res.end();
  });
});

apiRoutes.post( '/adminuser', function( req, res ){
  var id = 'admin'; //req.body.id;
  var password = req.body.password;
  client.getUser( id, user => {
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'User ' + id + ' already existed.' }, 2, null ) );
    res.end();
  }, error => {
    var dt = new Date();
    var user = { id: id, password: password, name: 'admin', role: 0, loggedin: null };

    client.createUserTx( user, result => {
      //. Log 
      var body = 'Admin user password has set.';
      var user_id = user.id;
      createLog( body, user_id );

      res.write( JSON.stringify( { status: true }, 2, null ) );
      res.end();
    }, error => {
      console.log( error );
      res.status( 500 );
      res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
      res.end();
    });
  });
});


//. ここより上で定義する API には認証フィルタをかけない
//. ここより下で定義する API には認証フィルタをかける

apiRoutes.use( function( req, res, next ){
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    return res.status( 403 ).send( { status: false, message: 'No token provided.' } );
  }

  jwt.verify( token, app.get( 'superSecret' ), function( err, decoded ){
    if( err ){
      return res.json( { status: false, message: 'Invalid token.' } );
    }

    req.decoded = decoded;
    next();
  });
});

apiRoutes.post( '/user', function( req, res ){
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id && user.role == 0 ){
        console.log( 'POST /user : user.id = ' + user.id );

        var dt = new Date();

        var id = req.body.id;
        var password = req.body.password;
        var name = req.body.name;
        var role = req.body.role;

        client.getUser( id, user0 => {
          //. 更新
          var user1 = {
            id: id,
            password: ( password ? password : user0.password ),
            name: ( name ? name : user0.name ),
            role: role,
            loggedin: user0.loggedin
          };
          client.createUserTx( user1, result => {
            //. Log 
            var body = 'User: ' + user1.name + '(' + user1.id + ') was updated.';
            var user_id = user.id;
            createLog( body, user_id );

            res.write( JSON.stringify( { status: true, result: result }, 2, null ) );
            res.end();
          }, error => {
            console.log( error );
            res.status( 500 );
            res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
            res.end();
          });
        }, error => {
          //. 新規作成
          if( id && password && name ){
            var user1 = {
              id: id,
              password: password,
              name: name,
              role: role,
              loggedin: new Date( 0 )
            };
            client.createUserTx( user1, result => {
              //. Log 
              var body = 'User: ' + user1.name + '(' + user1.id + ') was created.';
              var user_id = user.id;
              createLog( body, user_id );

              res.write( JSON.stringify( { status: true, result: result }, 2, null ) );
              res.end();
            }, error => {
              res.status( 500 );
              res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
              res.end();
            });
          }else{
            //. 必須項目が足りない
            res.status( 400 );
            res.write( JSON.stringify( { status: false, message: 'Failed to create/update new user.' }, 2, null ) );
            res.end();
          }
        });
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Valid token is missing.' }, 2, null ) );
        res.end();
      }
    });
  }
});

apiRoutes.get( '/users', function( req, res ){
  client.getAllUsers( result => {
    res.write( JSON.stringify( result, 2, null ) );
    res.end();
  }, error => {
    res.status( 500 );
    res.write( JSON.stringify( error, 2, null ) );
    res.end();
  });
});

apiRoutes.get( '/user', function( req, res ){
  var id = req.query.id;

  client.getUser( id, result => {
    res.write( JSON.stringify( result, 2, null ) );
    res.end();
  }, error => {
    res.status( 404 );
    res.write( JSON.stringify( error, 2, null ) );
    res.end();
  });
});

apiRoutes.delete( '/user', function( req, res ){
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id && user.role == 0 ){
        console.log( 'DELETE /user : user.id = ' + user.id );

        var id = req.body.id;

        client.deleteUserTx( id, result => {
          //. Log 
          var body = 'User: ' + id + ' was deleted.';
          var user_id = user.id;
          createLog( body, user_id );

          res.write( JSON.stringify( { status: true }, 2, null ) );
          res.end();
        }, error => {
          res.status( 404 );
          res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
          res.end();
        });
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Valid token is missing.' }, 2, null ) );
        res.end();
      }
    });
  }
});

apiRoutes.post( '/group', function( req, res ){
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id && user.role == 0 ){
        console.log( 'POST /group : user.id = ' + user.id );

        var dt = new Date();

        var id = req.body.id;
        var name = req.body.name;
        var member_ids = ( req.body.member_ids && req.body.member_ids.length > 0 ? req.body.member_ids.split(',') : null );

        client.getGroup( id, group0 => {
          //. 更新
          var group1 = {
            id: id,
            name: name,
            member_ids : member_ids
          };
          client.createGroupTx( group1, result => {
            //. Log 
            var body = 'Group: ' + group1.name + '(' + group1.id + ') was updated.';
            var user_id = user.id;
            createLog( body, user_id );

            res.write( JSON.stringify( { status: true, result: result }, 2, null ) );
            res.end();
          }, error => {
            console.log( error );
            res.status( 500 );
            res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
            res.end();
          });
        }, error => {
          //. 新規作成
          if( id && name ){
            var group1 = {
              id: id,
              name: name,
              member_ids: member_ids
            };
            client.createGroupTx( group1, result => {
              //. Log 
              var body = 'Group: ' + group1.name + '(' + group1.id + ') was created.';
              var user_id = user.id;
              createLog( body, user_id );

              res.write( JSON.stringify( { status: true, result: result }, 2, null ) );
              res.end();
            }, error => {
              res.status( 500 );
              res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
              res.end();
            });
          }else{
            //. 必須項目が足りない
            res.status( 400 );
            res.write( JSON.stringify( { status: false, message: 'Failed to create/update new group.' }, 2, null ) );
            res.end();
          }
        });
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Valid token is missing.' }, 2, null ) );
        res.end();
      }
    });
  }
});

apiRoutes.get( '/groups', function( req, res ){
  client.getAllGroups( result => {
    res.write( JSON.stringify( result, 2, null ) );
    res.end();
  }, error => {
    res.status( 500 );
    res.write( JSON.stringify( error, 2, null ) );
    res.end();
  });
});

apiRoutes.get( '/group', function( req, res ){
  var id = req.query.id;

  client.getGroup( id, result => {
    res.write( JSON.stringify( result, 2, null ) );
    res.end();
  }, error => {
    res.status( 404 );
    res.write( JSON.stringify( error, 2, null ) );
    res.end();
  });
});

apiRoutes.delete( '/group', function( req, res ){
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id && user.role == 0 ){
        console.log( 'DELETE /group : user.id = ' + user.id );

        var id = req.body.id;

        client.deleteGroupTx( id, result => {
          //. Log 
          var body = 'Group: ' + group1.id + ' was deleted.';
          var user_id = user.id;
          createLog( body, user_id );

          res.write( JSON.stringify( { status: true }, 2, null ) );
          res.end();
        }, error => {
          res.status( 404 );
          res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
          res.end();
        });
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Valid token is missing.' }, 2, null ) );
        res.end();
      }
    });
  }
});


apiRoutes.get( '/logs', function( req, res ){
  client.getAllLogs( result => {
    res.write( JSON.stringify( result, 2, null ) );
    res.end();
  }, error => {
    res.status( 500 );
    res.write( JSON.stringify( message, 2, null ) );
    res.end();
  });
});

apiRoutes.get( '/log', function( req, res ){
  var id = req.query.id;

  client.getLog( id, result => {
    res.write( JSON.stringify( result, 2, null ) );
    res.end();
  }, error => {
    res.status( 404 );
    res.write( JSON.stringify( message, 2, null ) );
    res.end();
  });
});

apiRoutes.post( '/log', function( req, res ){
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id ){
        console.log( 'POST /log : user.id = ' + user.id );
        if( req.body.body ){
          var id = uuid.v1();
          var body = req.body.body;
          var user_id = user.id;
          var log = {
            id: id,
            body: body,
            user_id: user_id
          };

          client.createLog( log, result0 => {
            res.status( 202 ); //Accepted??
            res.write( JSON.stringify( { status: true, result: result0 }, 2, null ) );
            res.end();
          }, error => {
            res.status( 500 );
            res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
            res.end();
          });
        }else{
          //. 必須項目が足りない(#40)
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: 'Failed to create/update new record.' }, 2, null ) );
          res.end();
        }
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Valid token is missing.' }, 2, null ) );
        res.end();
      }
    });
  }
});


apiRoutes.post( '/query', function( req, res ){
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id ){
        console.log( 'POST /query : user.id = ' + user.id );

        var datetimeFrom = req.body.datetimeFrom;
        var datetimeTo = req.body.datetimeTo;
        var condition = { user_id: user.id, datetimeFrom:datetimeFrom, datetimeTo: datetimeTo };
        console.log( 'query: condition = ' + JSON.stringify( condition, 2, null ) );

        client.queryLogs( condition, result => {
          var result0 = [];
          result.forEach(log => {
            result0.push( log );
          });

/* 
          //. Log 
          var body = 'User: ' + user.name + '(' + user.id + ') searched Logs.';
          var user_id = user.id;
          createLog( body, user_id );
*/

          res.write( JSON.stringify( result0, 2, null ) );
          res.end();
        }, error => {
          res.status( 403 );
          res.write( JSON.stringify( error, 2, null ) );
          res.end();
        });
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Valid token is missing.' }, 2, null ) );
        res.end();
      }
    });

//    res.status( 501 );
//    res.write( JSON.stringify( { status: false, message: 'Not implemented yet.' }, 2, null ) );
//    res.end();
  }
});

apiRoutes.get( '/userinfo', function( req, res ){
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id ){
        //. デコードして id が存在していれば成功とみなして、その user を返す
        res.write( JSON.stringify( { status: true, user: user }, 2, null ) );
        res.end();
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Valid token is missing.' }, 2, null ) );
        res.end();
      }
    });
  }
});


function createLog( body, user_id ){
  //. Log 
  var log_id = uuid.v1();
  var log = {
    id: log_id,
    body: body,
    user_id: user_id
  };
  client.createLogTx( log, result => {
    console.log( 'log created.');
  }, error => {
    console.log( 'log error: ' + JSON.stringify( error, 2, null ) );
  });
}


app.use( '/api', apiRoutes );

app.listen( port );
console.log( "server starting on " + port + " ..." );
