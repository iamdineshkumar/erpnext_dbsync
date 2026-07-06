import subprocess

def cmd_bench_restart():
    """Restart bench command"""
    
    try:
        
        result = subprocess.run(
                f"bench restart",
                shell=True,
                capture_output=True,
                text=True
            )
        
        if result.returncode == 0:
            print("Bench restarted successfully.")
        else:
            print(f"Error restarting bench: {result.stderr}")
        
    except subprocess.SubprocessError as e:
        print(f"An error occurred while trying to restart the bench: {e}")