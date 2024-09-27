from flask import Flask, render_template, jsonify, request
import requests

app = Flask(__name__, template_folder='./templates')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/crypto')
def crypto_ticker():
    return render_template('crypto.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
