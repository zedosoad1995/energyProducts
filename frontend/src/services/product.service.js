import axios from 'axios';

export async function getProducts(limit, offset){
    const {data: {products, header, maxSize}} = await axios.post(`http://localhost:8000/api/products?limit=${limit}&offset=${offset}`, {
        tableOptions: {attributesToDisplay: ['distributor', 'category', 'Altura', 'rating', 'numReviews', 'Peso']},
        limit,
        offset
    });
    
    const columns = header.map(res => {
        return {Header: res, accessor: res}
    });

    return {products, columns, maxSize};
}