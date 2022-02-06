import axios from 'axios';

export async function getProducts(request, limit, offset){
    const {data: {products, header, maxSize, attributeTypes, attributeRanges}} = await axios.post(`http://localhost:8000/api/products?limit=${limit}&offset=${offset}`, {
        tableOptions: request
    });
    
    const columns = header.map(res => {
        return {Header: res, accessor: res}
    });

    return {products, columns, maxSize, attributeTypes, attributeRanges};
}

export async function getAttrNames(limit, offset){
    return axios.get(`http://localhost:8000/api/productAttrNames`);
}