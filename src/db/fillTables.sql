INSERT IGNORE INTO 
    distributors (name, url)
VALUES 
    ('Worten', 'https://www.worten.pt');

INSERT IGNORE INTO 
    categories (name, url, distributorID)
VALUES 
    ('Esquentador', '/grandes-eletrodomesticos/aquecimento-de-agua/esquentadores', 1),
    ('Termoacumulador', '/grandes-eletrodomesticos/aquecimento-de-agua/termoacumuladores', 1);




