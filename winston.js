Tasks = new Mongo.Collection("tasks");
Blueprints = new Mongo.Collection('blueprints');

Router.route('/', function () {
  this.render('home');
});

Router.route('/logout', function () {
  Meteor.logout();
  this.render('home');
});

Router.route('/profile', function () {
  this.render('profile');
});

Router.route('/blueprints', function () {
  this.render('blueprints');
});

Router.route('/blueprints/create', function () {
  this.render('createBlueprint');
});


if (Meteor.isClient) {
  Template.createBlueprint.rendered = function () {
    AceEditor.instance('editor', {
      mode: "javascript",
      theme: 'solarized_dark'
    }, (editor) => {
      editor.setOptions({
        fontSize: "11pt",
        showPrintMargin: false
      });
    });
  };

  Template.createBlueprint.events({
    "click .save-task": event => {
      Meteor.call('addBlueprint', $('.title').val(), $('.description').val(), AceEditor.instance('editor').getValue());
    }
  });

  Template.home.helpers({
    tasks: () => {
      return Tasks.find();
    },
    results: () => {
      return Session.get('results');
    }
  });

  Template.task.helpers({
    taskResult: () => {
      return Session.get('taskResult');
    }
  });

  Template.blueprints.helpers({
    mine: () => Blueprints.find({owner: Meteor.userId()}),
    others: () => Blueprints.find({owner: {"$ne": Meteor.userId()}})
  });

  Template.header.rendered = () => {
    $('.dropdown-button').dropdown({
        inDuration: 300,
        outDuration: 225,
        constrain_width: false, // Does not change width of dropdown to that of the activator
        hover: true, // Activate on hover
        click: true,
        gutter: 0, // Spacing from edge
        belowOrigin: true, // Displays dropdown below the button
        alignment: 'right' // Displays dropdown with edge aligned to the left of button
      }
    );
  };

  Template.home.events({
    "keyup .search-input": event => {
      $('.header.hide').removeClass('hide');
      $('h1').hide();
      $('.search').addClass('close');

      let text = event.target.value;
      let re = new RegExp(text, 'i');
      let tasks = (text) ? Tasks.find({title: {$regex: re}}).fetch() : false;
      Session.set('results', tasks);
      Session.set('taskResult', false);
    }
  });

  Template.task.events({
    'keypress .task, click .task': function (event) {
      var self = this; // XXX Why can't I ES6 `this`?
      if (event.which === 13 || event.type === 'click') {
        Meteor
          .callPromise('runTask', self.fn, self.resultFn)
          .then(function (res) {
            Session.set('taskResult', res);
          });
      }
    }
  });
}

if (Meteor.isServer) {
  let vm = Npm.require('vm');
  let util = Npm.require('util');

  Meteor.startup(function () {
    let request = Meteor.npmRequire('request-promise');

    //ServiceConfiguration.configurations.upsert(
    //  {service: "google"},
    //  {
    //    $set: {
    //      clientId: "213030778010-km77iilsoiakds3r14np4dsnsduuqoq3.apps.googleusercontent.com",
    //      loginStyle: "popup",
    //      secret: "1A1zZoEbT7yYYYgZfzf20PkU"
    //    }
    //  }
    //);

    Meteor.methods({
      addBlueprint: (title, description, fn) => {
        Blueprints.insert({
          title,
          description,
          fn,
          owner: Meteor.userId()
        });
      },
      runTask: (fnString, responseString) => {
        let lib = {
          request: request
        };
        let execute = '(function (lib) { ' + fnString + ' })(lib);';
        let script = new vm.Script(execute);
        let context = new vm.createContext({console, lib});

        return script.runInContext(context).then(function (result) {
          let responseExecute = '(function (result) { ' + responseString + '})(result);';
          let responseScript = new vm.Script(responseExecute);
          let responseContext = new vm.createContext({console, lib, result});
          return responseScript.runInContext(responseContext);
        });
      }
    });
  });
}

AccountsTemplates.configure({
  hideSignUpLink: true,
  texts: {
    title: {
      signIn: ''
    }
  }
});
