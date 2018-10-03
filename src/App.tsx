import React from 'react';
import './App.css';
import Map from './Components/Map/Map';
import { IScenario } from './Components/Map/types';
import sampleScenario from './sample-scenario.json';

const App = () => <Map scenario={sampleScenario as IScenario} />;

export default App;
