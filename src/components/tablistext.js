import PropTypes from 'prop-types';
import { Component } from 'preact';
import cx from 'clsx';

export default class TabListExt extends Component {
  static defaultProps = {
    className: 'react-tabs__tab-list',
  };

  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    className: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.array,
      PropTypes.object,
    ]),
  };

  render() {
    const { title, children, className, ...attributes } = this.props;

    return (
      <div className="react-tabs__title-wrapper hcontainer" style={{width:'100%', height: '30px'}}>
        <span className="react-tabs__title" style={{width:'100%'}}>{title || ''}</span>
        <ul {...attributes} className={cx(className)} role="tablist" style={{whiteSpace: 'nowrap'}}>
            {children}
        </ul>
      </div>
    );
  }
}

TabListExt.tabsRole = 'TabList';
