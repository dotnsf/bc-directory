//. hyperledger-client.js

//. Run following command to deploy business network before running this app.js
//. $ composer network deploy -p hlfv1 -a ./bc-directory.bna -i PeerAdmin -s secret
var settings = require( './settings' );

const NS = 'me.juge.bcdirectory.model';
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;

const HyperledgerClient = function() {
  var vm = this;
  vm.businessNetworkConnection = null;
  vm.businessNetworkDefinition = null;

  vm.prepare = (resolved, rejected) => {
    if (vm.businessNetworkConnection != null && vm.businessNetworkDefinition != null) {
      resolved();
    } else {
      console.log('HyperLedgerClient.prepare(): create new business network connection');
      vm.businessNetworkConnection = new BusinessNetworkConnection();
      const connectionProfile = settings.connectionProfile;
      const businessNetworkIdentifier = settings.businessNetworkIdentifier;
      const participantId = settings.participantId;
      const participantPwd = settings.participantPwd;
      return vm.businessNetworkConnection.connect(connectionProfile, businessNetworkIdentifier, participantId, participantPwd)
      .then(result => {
        vm.businessNetworkDefinition = result;
        resolved();
      }).catch(error => {
        console.log('HyperLedgerClient.prepare(): reject');
        rejected(error);
      });
    }
  };

  vm.createUserTx = (user, resolved, rejected) => {
    vm.prepare(() => {
      let factory = vm.businessNetworkDefinition.getFactory();
      let transaction = factory.newTransaction(NS, 'CreateUserTx');
      transaction.id = user.id;
      transaction.password = user.password;
      transaction.name = user.name;
      transaction.role = user.role;

      return vm.businessNetworkConnection.submitTransaction(transaction)
      .then(result => {
        var result0 = {transactionId: transaction.transactionId, timestamp: transaction.timestamp};
        resolved(result0);
      }).catch(error => {
        console.log('HyperLedgerClient.createUserTx(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.deleteUserTx = (id, resolved, rejected) => {
    vm.prepare(() => {
      let factory = vm.businessNetworkDefinition.getFactory();
      let transaction = factory.newTransaction(NS, 'DeleteUserTx');
      transaction.id = id;
      return vm.businessNetworkConnection.submitTransaction(transaction)
      .then(result => {
        resolved(result);
      }).catch(error => {
        console.log('HyperLedgerClient.deleteUserTx(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.createGroupTx = (group, resolved, rejected) => {
    vm.prepare(() => {
      let currentDate = new Date();
      let oldDate = new Date(0);
      let factory = vm.businessNetworkDefinition.getFactory();
      let transaction = factory.newTransaction(NS, 'CreateGroupTx');
      transaction.id = group.id;
      transaction.name = group.name;
      transaction.member_ids = group.member_ids;

      return vm.businessNetworkConnection.submitTransaction(transaction)
      .then(result => {
        var result0 = {transactionId: transaction.transactionId, timestamp: transaction.timestamp};
        resolved(result0);
      }).catch(error => {
        console.log('HyperLedgerClient.createGroupTx(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.deleteGroupTx = (id, resolved, rejected) => {
    vm.prepare(() => {
      let factory = vm.businessNetworkDefinition.getFactory();
      let transaction = factory.newTransaction(NS, 'DeleteGroupTx');
      transaction.id = id;
      return vm.businessNetworkConnection.submitTransaction(transaction)
      .then(result => {
        resolved(result);
      }).catch(error => {
        console.log('HyperLedgerClient.deleteGroupTx(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.createLogTx = (log, resolved, rejected) => {
    vm.prepare(() => {
      let currentDate = new Date();
      let factory = vm.businessNetworkDefinition.getFactory();
      let transaction = factory.newTransaction(NS, 'CreateLogTx');
      transaction.id = log.id;
      transaction.body = log.body;
      transaction.user_id = log.user_id;

      //console.log( log );
      //console.log( transaction );

      return vm.businessNetworkConnection.submitTransaction(transaction)
      .then(result => {
        var result0 = {transactionId: transaction.transactionId, timestamp: transaction.timestamp};
        resolved(result0);
      }).catch(error => {
        console.log('HyperLedgerClient.createLogTx(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.getUser = (id, resolved, rejected) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getParticipantRegistry(NS + '.User')
      .then(registry => {
        return registry.resolve(id);
      }).then(user => {
        user["password"] = settings.maskPattern;
        resolved(user);
      }).catch(error => {
        console.log('HyperLedgerClient.getUser(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.getUserForLogin = (id, resolved, rejected) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getParticipantRegistry(NS + '.User')
      .then(registry => {
        return registry.resolve(id);
      }).then(user => {
        console.log( JSON.stringify( user, 2, null ) );
        resolved(user);
      }).catch(error => {
        console.log('HyperLedgerClient.getUserForLogin(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.getAllUsers = ( resolved, rejected ) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getParticipantRegistry(NS + '.User')
      .then(registry => {
        return registry.getAll();
      })
      .then(users => {
        let serializer = vm.businessNetworkDefinition.getSerializer();
        var result = [];
        users.forEach(user => {
          user["password"] = settings.maskPattern;
          result.push(serializer.toJSON(user));
        });
        resolved(result);
      }).catch(error => {
        console.log('HyperLedgerClient.getAllUsers(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.getGroup = (id, resolved, rejected) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getParticipantRegistry(NS + '.Group')
      .then(registry => {
        return registry.resolve(id);
      }).then(group => {
        resolved(group);
      }).catch(error => {
        console.log('HyperLedgerClient.getGroup(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.getAllGroups = ( resolved, rejected ) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getParticipantRegistry(NS + '.Group')
      .then(registry => {
        return registry.getAll();
      })
      .then(groups => {
        let serializer = vm.businessNetworkDefinition.getSerializer();
        var result = [];
        groups.forEach(group => {
          result.push(serializer.toJSON(group));
        });
        resolved(result);
      }).catch(error => {
        console.log('HyperLedgerClient.getAllGroups(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.getLog = (id, resolved, rejected) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getAssetRegistry(NS + '.Log')
      .then(registry => {
        return registry.resolve(id);
      }).then(log => {
        resolved(log);
      }).catch(error => {
        resolved(null);
      });
    }, rejected);
  };

  vm.getAllLogs = (resolved, rejected) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getAssetRegistry(NS + '.Log')
      .then(registry => {
        return registry.getAll();
      })
      .then(logs => {
        let serializer = vm.businessNetworkDefinition.getSerializer();
        var result = [];
        logs.forEach(log => {
          result.push(serializer.toJSON(log));
        });
        resolved(result);
      }).catch(error => {
        console.log('HyperLedgerClient.getAllLogs(): reject');
        rejected(error);
      });
    }, rejected);
  };

  //.   'SELECT me.juge.bcdirectory.model.Log WHERE ( XXXX == _$XXXX AND YYYY == _$YYYY )'
  //.   WHERE の後ろにカッコは一回
  vm.queryLogs = (condition, resolved, rejected) => {
    var user = condition.user;
    var queryname = null;
    var where = '';
    var params = {};

    //. クエリー文を動的に作成してビルドする
    if( condition.user_id ){
      params['user_id'] = condition.user_id;
      where += 'user_id = _$user_id';
    }
    if( condition.datetimeFrom && condition.datetimeTo ){
      params['datetimeFrom'] = condition.datetimeFrom;
      params['datetimeTo'] = condition.datetimeTo;
      var tomorrowTime = ( new Date( condition.datetimeTo ) ).getTime() + ( 86400 * 1000 );
      var tomorrow = new Date( tomorrowTime );
      var t_yyyy = tomorrow.getFullYear();
      var t_mm = tomorrow.getMonth() + 1;
      var t_dd = tomorrow.getDate();
      params['datetimeTo'] = t_yyyy + '-' + ( t_mm < 10 ? '0' : '' ) + t_mm + '-' + ( t_dd < 10 ? '0' : '' ) + t_dd;
      if( where.length > 0 ){
        where += ' AND ';
      }
      where += 'datetime >= _$datetimeFrom AND datetime < _$datetimeTo';
    }else if( condition.datetimeFrom ){
      params['datetimeFrom'] = condition.datetimeFrom;
      if( where.length > 0 ){
        where += ' AND ';
      }
      where += 'datetime >= _$datetimeFrom';
    }else if( condition.datetimeTo ){
      var tomorrowTime = ( new Date( condition.datetimeTo ) ).getTime() + ( 86400 * 1000 );
      var tomorrow = new Date( tomorrowTime );
      var t_yyyy = tomorrow.getFullYear();
      var t_mm = tomorrow.getMonth() + 1;
      var t_dd = tomorrow.getDate();
      params['datetimeTo'] = t_yyyy + '-' + ( t_mm < 10 ? '0' : '' ) + t_mm + '-' + ( t_dd < 10 ? '0' : '' ) + t_dd;
      if( where.length > 0 ){
        where += ' AND ';
      }
      where += 'datetime < _$datetimeTo';
    }

    vm.prepare(() => {
      var select = 'SELECT me.juge.bcdirectory.model.Log' + ( ( where.length > 0 ) ? ( ' WHERE (' + where + ')' ) : '' );
      var query = vm.businessNetworkConnection.buildQuery( select );

      return vm.businessNetworkConnection.query(query, params)
      .then(logs => {
        let serializer = vm.businessNetworkDefinition.getSerializer();
        var result = [];
        logs.forEach(log => {
          result.push(serializer.toJSON(log));
        });
        resolved(result);
      }).catch(error => {
        console.log('HyperLedgerClient.query(): reject');
        console.log( error );
        rejected(error);
      });
    }, rejected);
  };
}

module.exports = HyperledgerClient;
