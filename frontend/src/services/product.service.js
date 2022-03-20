import axios from 'axios';

export async function getProducts(request, limit, offset){
    const {data: {products, header, maxSize, attributeTypes, attributeRanges}} = await axios.post(`http://localhost:5432/api/v1/products?limit=${limit}&offset=${offset}`, {
        tableOptions: request
    });

    return {products, header, maxSize, attributeTypes, attributeRanges};
}

export async function getAttrNames(){
    return axios.get(`http://localhost:5432/api/v1/productAttrNames`);
}