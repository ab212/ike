var React = require('react/addons');
var bs = require('react-bootstrap');
var PageHeader = bs.PageHeader;
var TabbedArea = bs.TabbedArea;
var TabPane = bs.TabPane;
var DropdownButton = bs.DropdownButton;
var MenuItem = bs.MenuItem;
var SearchInterface = require('./components/search/SearchInterface.js');
var TablesInterface = require('./components/table/TablesInterface.js');
var TableManager = require('./managers/TableManager.js');
var ConfigInterface = require('./components/config/ConfigInterface.js');
var HelpInterface = require('./components/help/HelpInterface.js');
var xhr = require('xhr');
var DictApp = React.createClass({
  mixins: [React.addons.LinkedStateMixin],
  componentDidMount: function() {
    TableManager.addChangeListener(function(tables) {
      var target = this.linkState('target');
      this.setState({tables: tables});
      if(target.value == null && tables) {
        for(var tableName in tables) {
          if(tables.hasOwnProperty(tableName)) {
            target.requestChange(tableName);
            break;
          }
        }
      }
    }.bind(this));
    TableManager.setUserEmail(localStorage["userEmail"]);

    // Get the corpora via API request
    xhr({
      uri: '/api/corpora',
      method: 'GET'
    }, function(err, resp, body) {
      var corpora = JSON.parse(body).map(function(corpus, i) {
        return { 
          name: corpus.name,
          description: corpus.description,
          selected: true 
        }
      });
      this.setState({corpora: corpora});
    }.bind(this));
  },
  getInitialState: function() {
    return {
      corpora: [],
      config: {
        limit: 1000,
        evidenceLimit: 10,
        hideAdded: false,
        groupsPerPage: 25,
        ml: {
           disable: true,
           depth: 3,
           beamSize: 25,
           maxSampleSize: 8000,
           pWeight: 2.0,
           nWeight: -1.0,
           uWeight: 0.01,
           pWeightNarrow: 2.0,
           nWeightNarrow: -1.0,
           uWeightNarrow: 0.01
        }
      },
      results: {
        groups: [],
        qexpr: null,
        pending: false,
        request: null,
        errorMessage: null
      },
      userEmail: localStorage["userEmail"],
      userImageUrl: localStorage["userImageUrl"],
      tables: [],
      target: null
    };
  },
  renderContent: function() {
    var target = this.linkState('target');
    var results = this.linkState('results');
    var config = this.linkState('config');
    var corpora = this.linkState('corpora');
    var searchInterface =
      <SearchInterface 
          config={config} 
          corpora={corpora}
          toggleCorpora={this.toggleCorpora}
          results={results} 
          target={target}/>;
    var tablesInterface = <TablesInterface target={target}/>;
    var configInterface = 
      <ConfigInterface 
          config={config} 
          corpora={corpora}
          toggleCorpora={this.toggleCorpora}/>;
    var helpInterface = <HelpInterface/>;
    return (
      <div>
        <TabbedArea animation={false}>
          <TabPane className="mainContent" eventKey={1} tab="Search">
            {searchInterface}
          </TabPane>
          <TabPane className="mainContent" eventKey={2} tab="Tables">
            {tablesInterface}
          </TabPane>
          <TabPane className="mainContent" eventKey={3} tab="Configuration">
            {configInterface}
          </TabPane>
          <TabPane className="mainContent" eventKey={4} tab="Help">
            {helpInterface}
          </TabPane>
        </TabbedArea>
      </div>
    );
  },
  onSignIn: function(authResult) {
    var self = this
    if (authResult['status']['signed_in']) {
      gapi.client.load('plus','v1', function() {
        var request = gapi.client.plus.people.get({ userId: "me" });
        request.execute(function(resp) {
          var userEmail = resp.emails[0].value;
          self.setState({
            userEmail: userEmail,
            userImageUrl: resp.image.url
          });
          TableManager.setUserEmail(userEmail);
          localStorage["userEmail"] = userEmail;
          localStorage["userImageUrl"] = resp.image.url;
        });
      });
    } else {
      self.setState({
        userEmail: null,
        userImageUrl: null
      });
      TableManager.setUserEmail(null);
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userImageUrl");
    }
  },
  signIn: function() {
    var additionalParams = {
      scope: "email",
      callback: this.onSignIn,
      cookiepolicy: "single_host_origin",
      clientid: "793503486502-8q1pf7shj3jq7ak2q8ib1ca5hlufdfv7.apps.googleusercontent.com"
    };
    gapi.auth.signIn(additionalParams);
  },
  signOut: function() {
    gapi.auth.signOut();
    this.setState({
      userEmail: null,
      userImageUrl: null
    });
    TableManager.setUserEmail(null);
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userImageUrl");
  },
  toggleCorpora: function(i) {
    return function(e) {
      var corpora = this.state.corpora.slice();
      corpora[i].selected = e.target.checked;
      this.setState({corpora: corpora});
    }.bind(this);
  },
  renderHeader: function() {
    window.onSignIn = this.onSignIn;
    var userImage = this.state.userEmail ? this.state.userEmail : "Please sign in!";
    userImage = [userImage + " "];
    userImage.push(
      <img
        src={this.state.userImageUrl ? this.state.userImageUrl : "/assets/blank_user.png"}
        key="userImage"
        width="24"
        height="24"/>);
    var authMenuOption =
      this.state.userEmail ?
        <MenuItem key="signOut" onSelect={this.signOut}>{"Sign out"}</MenuItem> :
        <MenuItem key="signIn" onSelect={this.signIn}>{"Sign in"}</MenuItem>;

    var authButtons =
      <DropdownButton title={userImage} pullRight>
        {authMenuOption}
      </DropdownButton>;

    return (<header>
      <a href="/"><img src="/assets/logo.png" width="64"/></a>
      <em>&ldquo;The Pacific Northwest&#39;s Cutest Extraction Tool&rdquo;</em>
      <div className="pull-right">{authButtons}</div>
    </header>);
  },
  render: function() {
    var content = this.renderContent();
    var header = this.renderHeader();
    return <div>{header}{content}</div>;
  }
});
React.render(<DictApp/>, document.body);
