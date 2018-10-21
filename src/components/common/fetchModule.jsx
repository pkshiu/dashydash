/*
  FetchModule

  A type of module that will fetch data from the client/browser side directly.
  After fetching from the url (see below), the result is set to the self.callback(body) function.

  Usage:
  - set self.interval
  - supply callback(body)

*/

"use strict";

var React = require('react');

function setIntervalAndExecute(f, t) {
  f();
  return setInterval(f, t);
}

String.prototype.lowercaseFirst = String.prototype.lowercaseFirst || function() {
  return this.charAt(0).toLowerCase() + this.slice(1);
}



class FetchModule extends React.Component {
  constructor(props){
    super(props);
  }

  goFetch() {
    const opts = {
      method: 'GET'
    };
    const url = '/api/' + this.constructor.name.lowercaseFirst();
    let self = this;
    fetch(url, opts).then(response => {
      return response.json();
    })
    .then(body => {
      self.callback(body);
    })
    .catch(error => {
      console.log('Error: ', error);
    });
  }

  componentDidMount() {
    const self = this;
    this.intervalId = setIntervalAndExecute(() =>  self.goFetch(), self.interval);
  }

  componentWillUnmount() {
    clearInterval(this.intervalId);
  }
}

module.exports = FetchModule;