import axios from 'axios';

export async function getProducts(request, limit, offset){
    const {data: {products, header, maxSize}} = await axios.post(`http://localhost:8000/api/products?limit=${limit}&offset=${offset}`, {
        tableOptions: request,
        limit,
        offset
    });
    
    const columns = header.map(res => {
        return {Header: res, accessor: res}
    });

    return {products, columns, maxSize};
}

export async function getAttrNames(limit, offset){
    return axios.get(`http://localhost:8000/api/productAttrNames`);
}