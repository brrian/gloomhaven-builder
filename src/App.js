import React, { Component } from 'react';
import './App.css';
import Map from './Components/Map/Map';
import sampleScenario from './sample-scenario.json';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Map scenario={sampleScenario} />
      </div>
    );
  }
}

export default App;
