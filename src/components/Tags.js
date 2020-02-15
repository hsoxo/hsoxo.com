import React from 'react';
import './Tags.css'


function Tag(props) {
    return (
        <span className="article-tag">
            🏷️{props.value}
        </span>
    )
}


export function formatTags(tags) {
    const tagArray = tags.split(",");

    return tagArray.map((value, index) => {
        return <Tag value={value}/>
    });
}