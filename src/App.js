import React, { Component } from 'react';
import './App.css';
import axios from 'axios';
import _ from 'lodash';
import ReactModal from 'react-modal';

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
            showModalId: null,
            metaKeys: [],
        };
        //this.fillMetadata = this.fillMetadata.bind(this);
        this.toggleHeader = this.toggleHeader.bind(this);
        this.renderHeader = this.renderHeader.bind(this);
        this.removeChild = this.removeChild.bind(this);
        this.swapHeader = this.swapHeader.bind(this);
        this.buildMatrix = this.buildMatrix.bind(this);
        this.countTracks = this.countTracks.bind(this);
        this.setColNumber = this.setColNumber.bind(this);
        this.handleOpenModal = this.handleOpenModal.bind(this);
        this.handleCloseModal = this.handleCloseModal.bind(this);
        this.handleRowChange = this.handleRowChange.bind(this);
        this.renderRowSelection = this.renderRowSelection.bind(this);
        this.handleColumnChange = this.handleColumnChange.bind(this);
        this.renderColumnSelection = this.renderColumnSelection.bind(this);
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
                metaKeys,
                rowHeader: metaKeys[1],
                columnHeader: metaKeys[2],
            });
        });
    }

    handleOpenModal (id) {
        this.setState({ showModalId: id });
    }
      
    handleCloseModal () {
        this.setState({ showModalId: null });
    }

    toggleHeader(e) {
        const {name} = e.currentTarget;
        //console.log(name);
        let attrList;
        if (this.state.child2ancestor[name] === this.state.rowHeader) {
            attrList = this.state.rowList;
        } else {
            attrList = this.state.columnList;
        }
        //console.log(attrList);
        const index = _.findIndex(attrList, ['name', name]);
        //console.log(index);
        //console.log(attrList[index]);
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
        //console.log(newList);
        if (this.state.child2ancestor[name] === this.state.rowHeader) {
            this.setState({rowList: newList});
        } else {
            this.setState({columnList: newList});
        }
        this.setColNumber();

    }

    removeChild(list, parentName){
        //console.log(list);
        if (this.state.parent2children[parentName]) {
            for (let item of this.state.parent2children[parentName]){
                _.remove(list, function(n) {return n.name === item});
                this.removeChild(list, item);
            }
        }
        return list;
    }

    renderHeader(attr) {
        let attrList, rowClass='';
        if (attr === this.state.rowHeader) {
            attrList = this.state.rowList;
            rowClass = 'facet-row-header';
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
            if (prefix) {
                divList.push(
                    <div key={`${element.name}-${idx}`} className={rowClass}>
                        <button name={element.name} type="button" onClick={this.toggleHeader}>{prefix}{element.name}</button>
                    </div> 
                    );
            } else {
                divList.push(
                    <div key={`${element.name}-${idx}`} className={rowClass}>
                        <div name={element.name}>{prefix}{element.name}</div>
                    </div> 
                    );
            }
            
        }
        //console.log(divList);
        return divList;
    }

    /**
     * swap the column and row
     */
    swapHeader() {
        let {rowHeader, columnHeader, rowList, columnList} = this.state;
        if(columnHeader === 'notuse'){
            return;
        }
        [rowHeader, columnHeader] = [columnHeader, rowHeader];
        [rowList, columnList] = [columnList, rowList];
        this.setState({rowHeader, columnHeader, rowList, columnList});
        this.buildMatrix();
        this.setColNumber();
    }
    /**
     * build the matrix, actually list of divs, use grid to control layout
     */
    buildMatrix() {
        let divs = [];
        if (this.state.columnHeader !== 'notuse') {
            for (let row of this.state.rowList) {
                for (let col of this.state.columnList) {
                    if (row.expanded || col.expanded) {
                        divs.push( <div key={`${row.name}-${col.name}`}></div> );
                    } else {
                        divs.push(<div key={`${row.name}-${col.name}`}>{this.countTracks(row, col)}</div> );
                    }
                }
            }
        } else {
            for (let row of this.state.rowList) {
                if (row.expanded) {
                    divs.push( <div key={`${row.name}-col}`}></div> );
                } else {
                    divs.push(<div key={`${row.name}-col`}>{this.countTracks(row, 'notuse')}</div> );
                }
        }
        }
        
        //console.log(divs);
        return divs;
    }

    /**
     * 
     * @param {onject} row 
     * @param {object} col 
     * @return {ReactModal} how many tracks belong to the row and col combination, and popup the track list
     */
    countTracks(row, col) {
        let tracks = [];
        for (let track of this.state.data){
            if (row.name === this.state.rowHeader || track.metadata[this.state.rowHeader].includes(row.name)) {
                // confusing code here, need to check if column was used
                if (col === 'notuse') {
                    tracks.push(track);
                } else {
                    if ( col.name === this.state.columnHeader || track.metadata[this.state.columnHeader].includes(col.name) ) {
                        tracks.push(track);
                    }
                }
            }
        }
        //console.log(tracks);
        if (!tracks.length) {
            return;
        }
        const id = `modal-${row.name}-${col.name}`;
        return (
            <div>
            <button onClick={()=>this.handleOpenModal(id)}>{tracks.length}</button>
            <ReactModal 
               isOpen={this.state.showModalId === id}
               contentLabel="track list"
               ariaHideApp={false}
               id={id}
            >
              <button onClick={this.handleCloseModal}>Close</button>
              <div>
                <ul>
                {tracks.map(track => <li key={track.name}>{track.name}</li>)}
                </ul>
              </div>
            </ReactModal>
          </div>
        );
    }

    setColNumber() {
        let colNum = this.state.columnList.length;
        if (colNum === 0) {
            colNum = 1;
        }
        //console.log(colNum);
        document.documentElement.style.setProperty('--colNum', colNum+1);
    }

    renderRowSelection() {
        return (
            <label>
          Row:
          <select value={this.state.rowHeader} onChange={this.handleRowChange}>
            {this.state.metaKeys
                .filter(e => e!== this.state.columnHeader)
                .map(e => <option key={e} value={e}>{e}</option>)
            }
          </select>
        </label>
        );
    }

    handleRowChange(e) {
        this.setState(
            {
            rowHeader: e.currentTarget.value,
            rowList: [{ name: e.currentTarget.value, expanded: false, children: this.state.parent2children[e.currentTarget.value] }]
            }
        );
    }

    renderColumnSelection() {
        return (
            <label>
          Column:
          <select value={this.state.columnHeader} onChange={this.handleColumnChange}>
            {this.state.metaKeys
                .filter(e => e!== this.state.rowHeader)
                .map(e => <option key={e} value={e}>{e}</option>)
            }
            <option key="disabled" disabled>────</option>
            <option key="notuse" value="notuse">Not use</option>
          </select>
        </label>
        );
    }

    handleColumnChange(e) {
        if (e.currentTarget.value === "notuse") {
            this.setState(
                {
                columnHeader: 'notuse',
                columnList: [{name:'--'}]
                }
            );
        } else {
            this.setState(
                {
                columnHeader: e.currentTarget.value,
                columnList: [{ name: e.currentTarget.value, expanded: false, children: this.state.parent2children[e.currentTarget.value] }]
                }
            );
        }
        
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
                           {this.renderRowSelection()}
                        </div>
                        <div>
                            {this.renderColumnSelection()}
                        </div>
                    </div>
                    <div className="facet-content">
                        <div className="facet-swap">
                            <button title="swap row/column" onClick={this.swapHeader}>&#8646;</button>
                        </div>
                        {this.renderHeader(this.state.columnHeader)}
                        {this.renderHeader(this.state.rowHeader)}
                        {this.buildMatrix()}
                        {this.setColNumber()}
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
