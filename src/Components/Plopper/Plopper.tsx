import classNames from 'classnames';
import { find, upperFirst } from 'lodash';
import React, { Component, createRef, Fragment } from 'react';
import { ITokenAsset } from '../../assets';
import assetData from '../../assets.json';
import './Plopper.css';
import { IProps, IState } from './types';

class Plopper extends Component<IProps, IState> {
  public state: Readonly<IState> = {
    listItems: [],
    listSource: [],
    listVisible: false,
    listX: 0,
    listY: 0,
    plopperRotation: 0,
    plopperVisible: false,
  };

  private search: React.RefObject<HTMLInputElement> = createRef();

  private select: React.RefObject<HTMLDivElement> = createRef();

  public componentDidMount() {
    document.addEventListener('click', this.handleMouseClick);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  public componentDidUpdate(prevProps: IProps, prevState: IState) {
    if (
      this.state.plopperVisible &&
      this.state.type === 'token' &&
      prevProps.hoveredTile.orientation !== this.props.hoveredTile.orientation
    ) {
      this.correctPlopperRotation();
    } else if (!prevState.listVisible && this.state.listVisible) {
      this.search.current!.focus();
    } else if (prevState.listItems !== this.state.listItems) {
      this.ensureSelectedListItemExists();
    }
  }

  public componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleMouseClick);
  }

  public render() {
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

  private get src() {
    const { hoveredTile: { orientation } } = this.props;
    const { listSelected, type } = this.state;

    if (listSelected) {
      const fileName = type === 'monster' ? `${listSelected.id}-${orientation}` : listSelected.id;
      return `images/${type}s/${fileName}.png`;
    } else {
      throw new ReferenceError('Unable to get selected list item');
    }
  }

  private handleMouseClick = ({ shiftKey }: MouseEvent) => {
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
      (type !== 'tile' && !hoveredTile.name.length)
    ) { return; }

    if (listSelected && type) {
      handleItemPlopped(listSelected, type, x, y, plopperRotation);
    }

    if (type === 'tile' || shiftKey === false) {
      this.setState({ plopperVisible: false });
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
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

  private handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    this.setPlopperItem();
  }

  private handleSearchInput = ({ currentTarget: { value } }: React.FormEvent<HTMLInputElement>) => {
    const { listSource } = this.state;

    const regex = new RegExp(value.split('')
      .map(char => char.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
      .join('(?:.*)'), 'i');

    const listItems = listSource.filter(({ name }) => regex.test(name));

    this.setState({ listItems });
  }

  private handleListItemMouseOver = (index: number) => {
    this.selectListItemIndex(index);
  }

  private hideListOrPlopper() {
    this.setState({ listVisible: false, plopperVisible: false });
  }

  private showList(type: string) {
    const { x, y } = this.props;

    const listItems = assetData[`${type}s`];

    this.setState({
      listItems,
      listSource: listItems,
      listVisible: true,
      listX: x,
      listY: y,
      type,
    }, this.selectListItemIndex);
  }

  private selectAdjacentListItem(dir: string) {
    const { listSelected, listItems } = this.state;

    if (!listSelected) {
      throw new ReferenceError('Unable to find selected list item');
    }

    const index = listItems.findIndex(({ id }) => id === listSelected.id);
    let newIndex = index + (dir === 'next' ? 1 : -1);

    if (dir === 'next' && newIndex === listItems.length) {
      newIndex = 0;
    } else if (dir === 'prev' && newIndex < 0) {
      newIndex = listItems.length - 1;
    }

    this.selectListItemIndex(newIndex);
  }

  private selectListItemIndex(index = 0) {
    const { listItems } = this.state;

    this.setState({
      listSelected: { ...listItems[index] },
    }, this.ensureSelectedListItemIsVisible);
  }

  private ensureSelectedListItemExists() {
    const { listItems, listSelected } = this.state;

    if (!listSelected || !find(listItems, ['id', listSelected.id])) {
      this.selectListItemIndex();
    } else {
      this.ensureSelectedListItemIsVisible();
    }
  }

  private ensureSelectedListItemIsVisible() {
    const list = this.select.current;

    if (!list) { return };

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

  private setPlopperItem = () => {
    const { hoveredTile: { orientation } } = this.props;
    const { listSelected, type } = this.state;

    if (!listSelected) {
      throw new ReferenceError('Unable to find selected list item');
    }

    const { hexes = 1, id, isHorizontal } = listSelected as ITokenAsset;

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

  private correctPlopperRotation() {
    const { hoveredTile: { orientation } } = this.props;
    const { plopperRotation: prevRotation } = this.state;

    const rotation = orientation === 'h' ? 30 : -30;

    this.setState({ plopperRotation: prevRotation + rotation });
  }

  private rotatePlopper(counterclockwise = false) {
    this.setState(({ plopperRotation: prevRotation, type }) => {
      let rotation = type !== 'token' ? 30 : 60;

      if (counterclockwise) {
        rotation *= -1
      };

      return { plopperRotation: prevRotation + rotation };
    });
  }
}

export default Plopper;
