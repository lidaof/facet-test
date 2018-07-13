import React, { Component } from 'react';
import './App.css';
import axios from 'axios';
import _ from 'lodash';

const DEFAULT_ROW = 'Sample';
const DEFAULT_COLUMN = 'Assay';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            rowList: [], // object contains row elements {name: 'Sample', expanded: false, children: []}
            columnList: [],
            parent2children: {},
            child2ancestor: {}, // child to top most parent hash
            rowHeader: DEFAULT_ROW,
            columnHeader: DEFAULT_COLUMN,
        };
        //this.fillMetadata = this.fillMetadata.bind(this);
        this.toggleHeader = this.toggleHeader.bind(this);
        this.renderHeader = this.renderHeader.bind(this);
        this.removeChild = this.removeChild.bind(this);
        this.swapHeader = this.swapHeader.bind(this);
    }

    componentDidMount() {
        axios.get('https://wangftp.wustl.edu/~dli/tmp/test2.json').then(res => {
            //this.setState({ data: res.data });
            //this.fillMetadata(res.data);
            const metaKeys = Object.keys(res.data[0].metadata);
            const parent2children = {}; //key: parent terms, value: set of [child terms]
            const child2ancestor = {};
            for (let meta of metaKeys) {
                parent2children[meta] = new Set();
                child2ancestor[meta] = meta; // add 'sample': sample as well
            }
            for (let track of res.data) {
                for (let metaKey of metaKeys) {
                    const metaValue = track.metadata[metaKey];
                    if (Array.isArray(metaValue)) {
                        //array metadata, also need check length
                        if (metaValue.length > 1) {
                            //need loop over the array, constuct new key in parent2children hash
                            for (let [idx, ele] of metaValue.entries()) {
                                if (idx < metaValue.length - 1) {
                                    if (!parent2children[ele]) {
                                        parent2children[ele] = new Set();
                                    }
                                    parent2children[ele].add(metaValue[idx + 1]);
                                    child2ancestor[ele] = metaKey;
                                }
                            }
                        }
                        parent2children[metaKey].add(metaValue[0]);
                        child2ancestor[metaValue[0]] = metaKey;
                    } else {
                        //string metadata
                        parent2children[metaKey].add(metaValue);
                        child2ancestor[metaValue] = metaKey;
                    }
                }
            }
            //console.log(parent2children);
            this.setState({
                rowList: [{ name: this.state.rowHeader, expanded: false, children: parent2children[this.state.rowHeader] }],
                columnList: [{ name: this.state.columnHeader, expanded: false, children: parent2children[this.state.columnHeader] }],
                data: res.data,
                parent2children,
                child2ancestor,
                rowHeader: metaKeys[1],
                columnHeader: metaKeys[2],
            });
        });
    }

    toggleHeader(e) {
        const {name} = e.currentTarget;
        console.log(name);
        let attrList;
        if (this.state.child2ancestor[name] === this.state.rowHeader) {
            attrList = this.state.rowList;
        } else {
            attrList = this.state.columnList;
        }
        console.log(attrList);
        const index = _.findIndex(attrList, ['name', name]);
        console.log(index);
        console.log(attrList[index]);
        const isExpanded = !attrList[index].expanded;
        const newAttr = {...attrList[index], expanded: isExpanded}
        let newList = [...attrList];
        newList[index] = newAttr;
        if (isExpanded){
            for (let item of this.state.parent2children[name]){
                newList.splice(index+1, 0, { name: item, expanded: false, children: this.state.parent2children[item] })
            }
        }else {
            newList = [...newList.slice(0, index+1), ...newList.slice(index + 1 + this.state.parent2children[name].size)];
            //remove all child items, recursive
            this.removeChild(newList, name);
        }
        console.log(newList);
        if (this.state.child2ancestor[name] === this.state.rowHeader) {
            this.setState({rowList: newList});
        } else {
            this.setState({columnList: newList});
        }
        

    }

    removeChild(list, parentName){
        console.log(list);
        if (this.state.parent2children[parentName]) {
            for (let item of this.state.parent2children[parentName]){
                _.remove(list, function(n) {return n.name === item});
                this.removeChild(list, item);
            }
        }
        return list;
    }

    renderHeader(attr) {
        let attrList;
        if (attr === this.state.rowHeader) {
            attrList = this.state.rowList;
        } else {
            attrList = this.state.columnList;
        }
        let divList = [];
        for (let [idx,element] of attrList.entries()) {
            let prefix;
            if (element.children && element.children.size) {
                if (element.expanded) {
                    prefix = '⊟';
                } else {
                    prefix = '⊞';
                }
            } else {
                prefix = '';
            }
            let key=`${element}-${idx}`;
            if (prefix) {
                divList.push(
                    <div key={key}>
                        <button name={element.name} type="button" onClick={this.toggleHeader}>{prefix}{element.name}</button>
                    </div> 
                    );
            } else {
                divList.push(
                    <div key={key}>
                        <div name={element.name}>{prefix}{element.name}</div>
                    </div> 
                    );
            }
            
        }
        return divList;
    }

    swapHeader() {
        let {rowHeader, columnHeader, rowList, columnList} = this.state;
        [rowHeader, columnHeader] = [columnHeader, rowHeader];
        [rowList, columnList] = [columnList, rowList];
        this.setState({rowHeader, columnHeader, rowList, columnList});
    }

    render() {
        const { data } = this.state;
        if (!data.length) {
            return <p>Loading</p>;
        } else {

            //fill in rowList and columnList
            return (
                <div className="facet-container">
                    <div className="facet-config">
                        <div>
                            Row: <button>{DEFAULT_ROW}</button>
                        </div>
                        <div>
                            Column: <button>{DEFAULT_COLUMN}</button>
                        </div>
                    </div>
                    <div className="facet-content">
                        <div className="facet-swap">
                            <button title="swap row/column" onClick={this.swapHeader}>&#8646;</button>
                        </div>
                        <div className="facet-column-header">{this.renderHeader(this.state.columnHeader)}</div>
                        <div className="facet-row-header">{this.renderHeader(this.state.rowHeader)}</div>
                        <div className="facet-table">
                            <span>0</span> / <span>{data.length}</span>
                        </div>
                    </div>
                    <div></div>
                </div>
            );
        }
    }

    // async fillMetadata(data) {
    //     for (const item of data) {
    //         if (item.type === 'metadata' && item['vocabulary_set']) {
    //             for (const [key, val] of Object.entries(item['vocabulary_set'])) {
    //                 const content = await axios.get(val);
    //                 const tmp = { ...this.state.vocabulary_set, [key]: content.data };
    //                 this.setState({ vocabulary_set: tmp });
    //             }
    //             break;
    //         }
    //     }
    // }

    // render2() {
    //     const columns = [
    //         {
    //             id: 'name',
    //             Header: 'Name',
    //             accessor: d => d.name || 'no name'
    //         },
    //         {
    //             id: 'assay',
    //             Header: 'Assay',
    //             accessor: d => {
    //                 if (d.metadata && d.metadata.Assay && this.state.vocabulary_set.Assay) {
    //                     return this.state.vocabulary_set.Assay.terms[d.metadata.Assay][0];
    //                 }
    //                 return 'no assay';
    //             }
    //             //aggregate: vals => (vals)
    //         },
    //         {
    //             id: 'sample',
    //             Header: 'Sample',
    //             accessor: d => {
    //                 if (d.metadata && d.metadata.Sample && this.state.vocabulary_set.Sample) {
    //                     return this.state.vocabulary_set.Sample.terms[d.metadata.Sample][0];
    //                 }
    //                 return 'no sample';
    //             }
    //             //aggregate: vals => (vals)
    //         }
    //     ];

    //     return <ReactTable data={this.state.data} columns={columns} pivotBy={['sample', 'assay']} />;
    // }
}

export default App;
