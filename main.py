import random
import spacy
import json
import os
from flask import Flask, request, send_from_directory, jsonify

app = Flask(__name__, static_url_path='/')

try:
    nlp = spacy.load('local/model', disable=['parser', 'tagger'])
except:
    nlp = spacy.load('en', disable=['parser', 'tagger'])

@app.route('/')
def root():
    return send_from_directory('.', 'index.html')

@app.route('/sentence', methods=['GET'])
def sentence():
    try:
        with open('local/dataset.txt', 'r') as outfile:
            dataset = outfile.read().splitlines()
    except:
        return jsonify({})

    sentence = random.choice(dataset)
    doc = nlp(sentence)

    classified_sentence = {'text': sentence, 'entities': []}
    for ent in doc.ents:
        classified_sentence['entities'].append([ent.start_char, ent.end_char, ent.label_, ent.text])

    return jsonify(classified_sentence)

@app.route('/sentence/save', methods=['POST'])
def sentence_save():
    data = json.loads(request.form['data'])

    with open('local/dataset_classified.txt', 'a') as f:
        f.write(request.form['data'] + '\n')

    docs = [data['text']]
    golds = [{'entities': data['entities']}]

    ner = nlp.get_pipe('ner')

    extra_labels_key = 'extra_labels'
    if extra_labels_key in nlp.entity.cfg:
        extra_labels = nlp.entity.cfg[extra_labels_key]
    else:
        extra_labels = []

    for label in [x[2] for x in filter(lambda x: x[2] not in extra_labels, golds[0]['entities'])]:
        ner.add_label(label)

    optimizer = nlp.begin_training()
    nlp.update(docs, golds, sgd=optimizer, drop=0.2)
    nlp.to_disk('local/model')

    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

@app.route('/dataset')
def dataset():
    return send_from_directory('local', 'dataset_classified.txt')

@app.route('/dataset/save', methods=['POST'])
def dataset_save():
    dataset = request.files['dataset']
    dataset.save('local/dataset.txt')

    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('js', path)

@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('css', path)

if __name__ == '__main__':
    app.run()
