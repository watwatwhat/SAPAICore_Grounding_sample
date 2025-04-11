import base64
import requests
from vcap_services import load_from_vcap_services


def load_destination(destination_name: str):
    credentials = load_from_vcap_services("destination")
    client_id = credentials["clientid"]
    client_secret = credentials["clientsecret"]
    token_url = credentials["url"] + '/oauth/token'
    destination_url = credentials["uri"] + '/destination-configuration/v1/destinations'

    access_token = fetch_access_token(client_id, client_secret, token_url)
    return __fetch_destination(destination_name, destination_url, access_token)

def fetch_access_token(client_id: str, client_secret: str, token_url: str):
    headers = {
        'Authorization': 'Basic ' + base64.b64encode((f'{client_id}:{client_secret}').encode('utf-8')).decode(),
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    form = {
        'grant_type': 'client_credentials'
    }

    response = requests.post(token_url, headers=headers, data=form)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch access token: {response.text}")
    return response.json()['access_token']

def __fetch_destination(destination_name: str, destination_url: str, access_token: str):
    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.get(f'{destination_url}/{destination_name}', headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch destination: {response.text}")
    return response.json()['destinationConfiguration']
