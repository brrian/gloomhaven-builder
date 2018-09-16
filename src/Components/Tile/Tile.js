import React, { Component } from 'react';
import tileData from '../../tileData.json';
import './Tile.css';

class Tile extends Component {
  state = {
    ...tileData[this.props.name],
  };

  anchors = {};

  render() {
    const { name, rotation, x, y } = this.props;
    const { anchors, width, height } = this.state;

    return (
      <div
        className="tile"
        data-tile={name}
        style={{
          top: y,
          left: x,
          width,
          height,
          backgroundImage: `url(images/tiles/${name}.png)`,
          transform: `rotate(${rotation}deg)`
        }}
      >
        <div className="origin" />
        {anchors.map(([ left, top ], index) => (
          <div
            ref={el => this.anchors[index] = el}
            key={`${top}${left}`}
            id={`${name}-${index}`}
            className="anchor"
            style={{ top, left }}
          />
        ))}
    </div>
    );
  }
}

export default Tile;
