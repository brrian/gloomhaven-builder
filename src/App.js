import React, { Component } from 'react';
import './App.css';
import Map from './Components/Map/Map';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Map selectedTile={'a1a'} />
      </div>
    );
  }
}

export default App;
