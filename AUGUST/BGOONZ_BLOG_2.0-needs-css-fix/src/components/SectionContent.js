import _ from 'lodash';
import React from 'react';
import { classNames, markdownify, withPrefix } from '../utils';
import CtaButtons from './CtaButtons';
export default class SectionContent extends React.Component {
    render() {
        const section = _.get(this.props, 'section', null);
        return (
            <section id={_.get(section, 'section_id', null)} className="block block-text outer">
                <div className="outter">
                    <div
                        className={classNames('inner', {
                            'grid-swap': _.get(section, 'image', null) && _.get(section, 'image_position', null) === 'right'
                        })}
                    >
                        {_.get(section, 'image', null) && (
                            <div className="grid-item block-image">
                                <img src={withPrefix(_.get(section, 'image', null))} alt={_.get(section, 'image_alt', null)} />
                            </div>
                        )}
                        <div>
                            {_.get(section, 'title', null) && (
                                <div className="block-header">
                                    <h2 className="block-title">{_.get(section, 'title', null)}</h2>
                                </div>
                            )}
                            {_.get(section, 'content', null) && <div className="outer">{markdownify(_.get(section, 'content', null))}</div>}
                            {_.get(section, 'actions', null) && (
                                <div className="block-buttons">
                                    <CtaButtons {...this.props} actions={_.get(section, 'actions', null)} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        );
    }
}
