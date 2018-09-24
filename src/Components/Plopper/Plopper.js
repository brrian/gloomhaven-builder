import classNames from 'classnames';
import { List } from 'immutable';
import { upperFirst } from 'lodash';
import React, { Component, createRef, Fragment } from 'react';
import assetData from '../../assets.json';
import './Plopper.css';

class Plopper extends Component {
  state = {
    listItems: [],
    listSelected: false,
    listVisible: false,
    listX: 0,
    listY: 0,
    plopperRotation: 0,
    plopperVisible: false,
  };

  constructor(props) {
    super(props);

    this.search = createRef();
    this.select = createRef();
  }

  componentDidMount() {
    document.addEventListener('click', this.handleMouseClick);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.state.plopperVisible &&
      this.state.type === 'token' &&
      prevProps.hoveredTile.orientation !== this.props.hoveredTile.orientation
    ) {
      this.correctPlopperRotation();
    } else if (!prevState.listVisible && this.state.listVisible) {
      this.search.current.focus();
    } else if (prevState.listItems !== this.state.listItems) {
      this.ensureSelectedListItemExists();
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleMouseClick);
  }

  get src() {
    const { hoveredTile: { orientation } } = this.props;
    const { listSelected, type } = this.state;

    const fileName = type === 'monster' ? `${listSelected.id}-${orientation}` : listSelected.id;

    return `images/${type}s/${fileName}.png`;
  }

  handleMouseClick = ({ shiftKey }) => {
    const {
      listSelected,
      plopperRotation,
      plopperVisible,
      type,
    } = this.state;

    const {
      handleItemPlopped,
      hoveredTile,
      isAbleToPan,
      x,
      y,
    } = this.props;

    if (
      !plopperVisible ||
      isAbleToPan ||
      (type !== 'tile' && hoveredTile.name === false)
    ) { return; }

    handleItemPlopped(listSelected, type, x, y, plopperRotation);

    if (type === 'tile' || shiftKey === false) {
      this.setState({ plopperVisible: false });
    }
  }

  handleKeyDown = (event) => {
    const { listVisible, type, plopperVisible } = this.state;
    const { key, shiftKey } = event;

    if (key === 'Escape') {
      this.hideListOrPlopper();
    }

    if (listVisible) {
      if (key === 'Tab' || key === 'ArrowUp' || key === 'ArrowDown') {
        event.preventDefault();
        const dir = ((key === 'Tab' && shiftKey) || key === 'ArrowUp') ? 'prev' : 'next';
        this.selectAdjacentListItem(dir);
      }
    } else if (plopperVisible) {
      if ((key === 'r' || key === 'R') && type !== 'monster') {
        event.preventDefault();
        this.rotatePlopper(key === 'R');
      }
    } else {
      if (key === 't' || key === 'm' || key === 'k') {
        event.preventDefault();
        const types = { t: 'tile', m: 'monster', k: 'token' };
        this.showList(types[key]);
      }
    }
  }

  handleSearchSubmit = event => {
    event.preventDefault();
    this.setPlopperItem();
  }

  handleSearchInput = ({ currentTarget: { value } }) => {
    const { listSource } = this.state;

    const regex = new RegExp(value.split('')
      .map(char => char.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
      .join('(?:.*)'), 'i');

    const listItems = listSource.filter(({ name }) => regex.test(name));

    this.setState({ listItems });
  }

  handleListItemMouseOver = (index) => {
    this.selectListItemIndex(index);
  }

  hideListOrPlopper() {
    this.setState({ listVisible: false, plopperVisible: false });
  }

  showList(type) {
    const { x, y } = this.props;

    const listItems = List(assetData[`${type}s`]);

    this.setState({
      listItems,
      listSource: listItems,
      listVisible: true,
      listX: x,
      listY: y,
      type,
    }, this.selectListItemIndex);
  }

  selectAdjacentListItem(dir) {
    const { listSelected, listItems } = this.state;

    if (listSelected === false) { return };

    const index = listItems.findIndex(({ id }) => id === listSelected.id);
    let newIndex = index + (dir === 'next' ? 1 : -1);

    if (dir === 'next' && newIndex === listItems.size) {
      newIndex = 0;
    } else if (dir === 'prev' && newIndex < 0) {
      newIndex = listItems.size - 1;
    }

    this.selectListItemIndex(newIndex);
  }

  selectListItemIndex(index = 0) {
    const { listItems } = this.state;

    const item = listItems.get(index);

    this.setState({
      listSelected: { ...item },
    }, this.ensureSelectedListItemIsVisible);
  }

  ensureSelectedListItemExists() {
    const { listItems, listSelected } = this.state;

    if (!listItems.find(({ id }) => id === listSelected.id)) {
      this.selectListItemIndex();
    } else {
      this.ensureSelectedListItemIsVisible();
    }
  }

  ensureSelectedListItemIsVisible() {
    const list = this.select.current;
    const selected = list.querySelector('.isSelected');

    if (!selected) { return };

    const listBounds = list.getBoundingClientRect();
    const selectedBounds = selected.getBoundingClientRect();

    if (selectedBounds.bottom >= listBounds.bottom) {
      list.scrollTo(0, list.scrollTop + selectedBounds.bottom - listBounds.bottom);
    } else if (selectedBounds.top < listBounds.top) {
      list.scrollTo(0, list.scrollTop + selectedBounds.top - listBounds.top);
    }
  }

  setPlopperItem = () => {
    const { hoveredTile: { orientation } } = this.props;
    const { listSelected: { hexes = 1, id, isHorizontal }, type } = this.state;

    // We need to do something special for the start hex
    const plopperId = id === 'start-hex' && orientation === 'h' ? 'start-hex-h' : id;

    let plopperRotation = 0;

    if (type === 'token' && (
      (!isHorizontal && orientation === 'h' && plopperId !== 'start-hex-h') ||
      (isHorizontal && orientation === 'v')
    )) {
      plopperRotation = 30;
    }

    this.setState({
      hexes,
      listVisible: false,
      plopperRotation,
      plopperVisible: true,
    });
  }

  correctPlopperRotation() {
    const { hoveredTile: { orientation } } = this.props;
    const { plopperRotation: prevRotation } = this.state;

    const rotation = orientation === 'h' ? 30 : -30;

    this.setState({ plopperRotation: prevRotation + rotation });
  }

  rotatePlopper(counterclockwise = false) {
    this.setState(({ plopperRotation: prevRotation, type }) => {
      let rotation = type !== 'token' ? 30 : 60;

      if (counterclockwise) {
        rotation *= -1
      };

      return { plopperRotation: prevRotation + rotation };
    });
  }

  render() {
    const { scale, x, y } = this.props;

    const {
      hexes,
      listItems,
      listSelected,
      listVisible,
      listX,
      listY,
      plopperVisible,
      plopperRotation,
      type,
    } = this.state;

    const transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${plopperRotation}deg)`;

    return (
      <Fragment>
        {listVisible && (
          <div className="Plopper__List" style={{ top: listY, left: listX }}>
            <form onSubmit={this.handleSearchSubmit}>
              <input ref={this.search} type="text" onInput={this.handleSearchInput} />
            </form>
            <div ref={this.select} className="Plopper__Select" onClick={this.setPlopperItem}>
              {listItems.map(({ id, name }, index) => (
                <div
                  key={id}
                  className={classNames(
                    'Plopper__Option',
                    { isSelected: listSelected && id === listSelected.id }
                  )}
                  onMouseOver={this.handleListItemMouseOver.bind(this, index)}
                >
                  <img src="https://placehold.it/100x100" width="50" height="50" alt=""/>
                  {name}
                </div>
              ))}
            </div>
          </div>
        )}
        {plopperVisible && (
          <div className="Plopper__ItemWrapper" style={{ transform }}>
            <img
              className={classNames('Plopper__Item', upperFirst(type))}
              src={this.src}
              data-hexes={hexes}
              alt=""
            />
          </div>
        )}
      </Fragment>
    );
  }
}

export default Plopper;
