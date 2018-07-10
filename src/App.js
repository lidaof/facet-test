import React, { Component } from 'react';
import './App.css';
import axios from 'axios';


const DEFAULT_ROW = 'Sample';
const DEFAULT_COLUMN = 'Assay';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
             
        };
        //this.fillMetadata = this.fillMetadata.bind(this);
    }

    componentDidMount() {
        axios.get('https://wangftp.wustl.edu/~dli/tmp/test2.json').then(res => {
            this.setState({ data: res.data });
            //this.fillMetadata(res.data);
        });
    }


    render(){
        const { data } = this.state;
        if (!data.length) {
            return <p>Loading</p>;
        } else {
            const metaKeys = Object.keys(data[0].metadata);
            console.log(metaKeys);
            const parent2children = {} //key: parent terms, value: set of [child terms]
            for (let meta of metaKeys){
                parent2children[meta] = new Set();
            }
            for (let track of data){
                console.log(track);
                for (let metaKey of metaKeys){
                    const metaValue = track.metadata.metaKey;
                    if (Array.isArray(metaValue) ) {
                        //array metadata, also need check length
                        if (metaValue.length > 1) {
                            //need loop over the array, constuct new key in parent2children hash
                            for ( let [idx,ele] of metaValue.entries() ){
                                if(idx < metaValue.length - 1) {
                                    if (!parent2children[ele]){
                                        parent2children[ele] = new Set(); 
                                    }
                                    parent2children[ele].add(metaValue[idx+1]);
                                }
                            }
                        } else {                            
                        }
                        parent2children[metaKey].add(metaValue[0]);
                    } else {
                        //string metadata
                        parent2children[metaKey].add(metaValue)
                    }
                }  
            }
            console.log(parent2children);
            return (
                <div className="facet-container">
                    <div className="facet-config">
                        <div>Row: <button>{DEFAULT_ROW}</button></div>
                        <div>Column: <button>{DEFAULT_COLUMN}</button></div>
                    </div>
                    <div className="facet-content">
                        <div className="facet-swap">
                            <button title="swap row/column">&#8646;</button>
                        </div>
                        <div className="facet-column-header">
                            {DEFAULT_COLUMN}
                        </div>
                        <div className="facet-row-header">
                            {DEFAULT_ROW}
                        </div>
                        <div className="facet-table">
                            <span>0</span> / <span>{data.length}</span>
                        </div>
                    </div>
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
