"use strict";
var React = require('react');
var moment = require('moment');
var FetchModule = require('../../common/fetchModule.jsx');



class AuthFlow extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      title : '',
      description : '',
      authenticated: false,
      authUrl: '',
      image : '',
      isLoaded: false
    };

    this.openGoogle = this.openGoogle.bind(this);
    this.doneGoogle = this.doneGoogle.bind(this);

    global.doneGoogle = this.doneGoogle;
  }

  componentDidMount() {

    /*
      Find out if we need to send user to authenticate backend.
    */
    const opts = {
      method: 'GET'
    };
    const url = '/api/setup';
    let self = this;
    fetch(url, opts).then(response => {
      return response.json();
    })
    .then(body => {

      this.setState({
        isLoaded: true,
        authenticated: body.authenticated,
        description: body.description,
        authUrl: body.authUrl
      });
    this.props.setAuthState(true);
    })
    .catch(error => {
      console.log('Error: ', error);
    });
  };

  openGoogle() {
    console.log('goign threre');
    console.log(this.state.authUrl);
    // window.open(this.state.authUrl, "auth", "height=400, width=400");
    window.open("/google/done/", "auth", "toolbar=yes,menubar=yes,scrollbars=yes,resizable=yes,height=400,width=400");
  };


  doneGoogle() {
    console.log("GOT IT");
    this.props.setAuthState(true);
  };

  render() {
    return (
      <div id='setup' style={{ backgroundImage: 'url(' + this.state.image + ')' }}>
        <div className="articleText">
          <h1>Setup Access to Google</h1>
          <p>{this.state.description}</p>

          <p>Go here: {this.authUrl}</p>
          <button type="button" className="btn primary" onClick={this.openGoogle}>Connect</button>

        </div>
      </div>
    );
  }
};





class AlbumList extends React.Component {


  constructor(props) {
    super(props);
    this.state = {
      albums: []
    };

    this.oneAlbum = this.oneAlbum.bind(this);
  }


  componentDidMount() {

    /*
      get albums
    */

    console.log('getting albums');

    const opts = {
      method: 'GET'
    };
    const url = '/api/albums';
    let self = this;
    fetch(url, opts).then(response => {
      return response.json();
    })
    .then(body => {

      this.setState({
        albums: body
      });
      console.log('got albums', this.state.albums)

    })
    .catch(error => {
      console.log('Error: ', error);
    });
  };

  oneAlbum(a) {
    console.log(a);
    return (<li key={a.id}><img src={a.coverUrl} height="100px" />{a.title}</li>)
  }

//      {this.state.albums.map(this.oneAlbum, this)}
//      {[1,2,3].map(this.oneAlbum, this)}
  render() {
    console.log('render:', this.state.albums);
    return (
      <div>
      <h2>Albums...</h2>
      <ul>
      {this.state.albums.map(this.oneAlbum)}
      </ul>
      </div>
      )
  }

}


class Setup extends React.Component {


  constructor(props) {
    super(props);
    this.state = {
      authenticated: false,
      isLoaded: false
    };
    console.log('constructor',this.state);

    this.setAuthState = this.setAuthState.bind(this);
  }


  componentDidMount() {

    /*
      Find out if we need to send user to authenticate backend.
    */

    console.log('did mount:', this.state);
    return;
    const opts = {
      method: 'GET'
    };
    const url = '/api/setup';
    let self = this;
    fetch(url, opts).then(response => {
      return response.json();
    })
    .then(body => {

      this.setState({
        isLoaded: true,
        authenticated: body.authenticated,
        description: body.description,
        authUrl: body.authUrl
      })
    })
    .catch(error => {
      console.log('Error: ', error);
    });
  };


  setAuthState(s) {
    console.log('setting auth state', s);
    this.setState({authenticated: s});
    console.log('setup state:', this.state);
  }

  render() {
    if (!this.state.authenticated) {
      return (
        <AuthFlow setAuthState={this.setAuthState} />
        )
    }
    else return (
      <div>
        <h1>Done</h1>
        <AlbumList/>
      </div>
      )
  }
};

module.exports = Setup;
